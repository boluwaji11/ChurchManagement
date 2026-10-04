import { and, asc, desc, eq, isNull, inArray, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { pipelines, pipelineSteps, pipelineEntries, followUps } from "../schema/followups";
import { people } from "../schema/people";
import { tenants } from "../schema/tenancy";
import { visitorsBetween, absentPeople, DEFAULT_ABSENCE_THRESHOLD } from "./attendance";
import { PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";

/**
 * R5.1 to R5.7. Follow-up, which is the difference between a database and a
 * ministry tool.
 *
 * Six pipelines, written down. No workflow engine, no canvas, no conditions:
 * that is the feature that makes Rock RMS unusable by the person this product
 * is for. A church welcoming a visitor needs the three steps and a name against
 * each, and the steps are the same three at every church of this size.
 *
 * Entering a pipeline writes every one of its steps out as a dated task, so a
 * step can be reassigned or answered without the church losing what happened.
 */

export const CAN_FOLLOW_UP: readonly TenantRole[] = ["owner", "admin", "staff", "pastoral"];
export const canFollowUp = (role: TenantRole): boolean => CAN_FOLLOW_UP.includes(role);

export const PIPELINE_KEYS = [
  "first_visit", "second_visit", "absent", "baptism", "membership", "serving",
] as const;
export type PipelineKey = (typeof PIPELINE_KEYS)[number];

export const ENTRY_REASONS = [
  "by_hand", "first_visit", "second_visit", "absent", "milestone", "form",
] as const;
export type EntryReason = (typeof ENTRY_REASONS)[number];

/**
 * R5.2. The six, and the steps each one takes.
 *
 * The day counts are what a church can actually hold to: a thank you inside the
 * week, a conversation inside the fortnight, an invitation inside the month.
 */
export const DEFAULT_PIPELINES: {
  key: PipelineKey;
  name: string;
  description: string;
  hue: string;
  steps: { name: string; dueDays: number }[];
}[] = [
  {
    key: "first_visit",
    name: "First visit",
    description: "Somebody came for the first time.",
    hue: "sky",
    steps: [
      { name: "Say thank you", dueDays: 2 },
      { name: "Call them", dueDays: 7 },
      { name: "Invite them to something", dueDays: 21 },
    ],
  },
  {
    key: "second_visit",
    name: "Second visit",
    description: "They came back.",
    hue: "teal",
    steps: [
      { name: "Thank them for coming back", dueDays: 2 },
      { name: "Ask what brought them", dueDays: 10 },
      { name: "Introduce them to a group", dueDays: 28 },
    ],
  },
  {
    key: "absent",
    name: "Not seen for a while",
    description: "Somebody who was here every week has not been for three.",
    hue: "amber",
    steps: [
      { name: "Check they are well", dueDays: 3 },
      { name: "Pastoral call", dueDays: 14 },
    ],
  },
  {
    key: "baptism",
    name: "Baptism",
    description: "Somebody asked about being baptised.",
    hue: "indigo",
    steps: [
      { name: "Talk it through", dueDays: 7 },
      { name: "Set a date", dueDays: 21 },
      { name: "Baptism", dueDays: 56 },
    ],
  },
  {
    key: "membership",
    name: "Membership",
    description: "Somebody is becoming a member.",
    hue: "violet",
    steps: [
      { name: "Confirm their place on the class", dueDays: 3 },
      { name: "Membership class", dueDays: 21 },
      { name: "Welcome them in", dueDays: 35 },
    ],
  },
  {
    key: "serving",
    name: "Serving",
    description: "Somebody wants to help.",
    hue: "rose",
    steps: [
      { name: "Find out what they would enjoy", dueDays: 5 },
      { name: "Background check, where the role needs one", dueDays: 14 },
      { name: "Put them with a team", dueDays: 28 },
    ],
  },
];

export interface Pipeline {
  id: string;
  key: string;
  name: string;
  description: string | null;
  hue: string;
  position: number;
  ownerUserId: string | null;
  archived: boolean;
  steps: { id: string; name: string; dueDays: number; position: number }[];
}

export interface FollowUp {
  id: string;
  personId: string;
  personName: string;
  title: string;
  pipelineName: string | null;
  pipelineHue: string | null;
  entryId: string | null;
  assigneeUserId: string | null;
  dueOn: string | null;
  doneAt: Date | null;
  outcome: string | null;
  position: number;
}

export interface PipelineEntry {
  id: string;
  pipelineId: string;
  pipelineKey: string;
  pipelineName: string;
  pipelineHue: string;
  personId: string;
  personName: string;
  status: string;
  reason: string;
  startedOn: string;
  exitReason: string | null;
  steps: FollowUp[];
}

const trim = (value: string | null | undefined): string | null => value?.trim() || null;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const day = (value: string): string => {
  if (!ISO.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new InvalidInputError("followup.error.day");
  }
  return value;
};

/** Days added to a date, in UTC, so a timezone cannot move a due day. */
function addDays(iso: string, days: number): string {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

const called = (row: { firstName: string; lastName: string; preferredName: string | null }) =>
  `${row.preferredName?.trim() || row.firstName} ${row.lastName}`;

/** R5.2. Created with the church. Running it again adds only what is missing. */
export async function seedPipelines(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
): Promise<void> {
  if (!canFollowUp(actor.role)) throw new PermissionError(actor.role, "manageFollowUps");

  const existing = await db
    .select({ key: pipelines.key })
    .from(pipelines)
    .where(eq(pipelines.tenantId, actor.tenantId));
  const have = new Set(existing.map((row) => row.key));

  for (const [index, preset] of DEFAULT_PIPELINES.entries()) {
    if (have.has(preset.key)) continue;
    const [row] = await db
      .insert(pipelines)
      .values({
        tenantId: actor.tenantId,
        key: preset.key,
        name: preset.name,
        description: preset.description,
        hue: preset.hue,
        position: index,
      })
      .returning({ id: pipelines.id });

    await db.insert(pipelineSteps).values(
      preset.steps.map((step, position) => ({
        tenantId: actor.tenantId,
        pipelineId: row!.id,
        name: step.name,
        dueDays: step.dueDays,
        position,
      })),
    );
  }
}

export async function listPipelines(
  db: Tx,
  opts: { includeArchived?: boolean } = {},
): Promise<Pipeline[]> {
  const rows = await db
    .select()
    .from(pipelines)
    .where(opts.includeArchived ? undefined : isNull(pipelines.archivedAt))
    .orderBy(asc(pipelines.position), asc(pipelines.name));
  if (rows.length === 0) return [];

  const steps = await db
    .select()
    .from(pipelineSteps)
    .where(inArray(pipelineSteps.pipelineId, rows.map((row) => row.id)))
    .orderBy(asc(pipelineSteps.position));

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    hue: row.hue,
    position: row.position,
    ownerUserId: row.ownerUserId,
    archived: row.archivedAt !== null,
    steps: steps
      .filter((step) => step.pipelineId === row.id)
      .map((step) => ({
        id: step.id, name: step.name, dueDays: step.dueDays, position: step.position,
      })),
  }));
}

/**
 * R5.1, R5.3, R5.4. Putting somebody in a pipeline.
 *
 * Every step is written out at once, dated from the day they entered. Somebody
 * already in it stays where they are rather than starting again, because a
 * person who visits twice in a fortnight is one visitor.
 */
export async function enterPipeline(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string | null },
  input: {
    pipelineKey?: PipelineKey;
    pipelineId?: string;
    personId: string;
    on: string;
    reason?: EntryReason;
    assigneeUserId?: string | null;
  },
): Promise<PipelineEntry | null> {
  if (!canFollowUp(actor.role)) throw new PermissionError(actor.role, "manageFollowUps");
  // Somebody asked for this, so a pipeline that is not there is an error they
  // need to see. A trigger firing on its own is the quiet case, below.
  return enterPipelineAuto(db, actor.tenantId, { ...input, quiet: false });
}

/**
 * R5.3. The same, with nobody asking for it.
 *
 * Used by the triggers, which run on behalf of the church rather than on behalf
 * of a person, so there is no role to check. Everything that reaches it has
 * already been through a path that did check one.
 */
export async function enterPipelineAuto(
  db: Tx,
  tenantId: string,
  input: {
    pipelineKey?: PipelineKey;
    pipelineId?: string;
    personId: string;
    on: string;
    reason?: EntryReason;
    assigneeUserId?: string | null;
    /**
     * Whether a missing pipeline passes in silence. True for a trigger, because
     * the milestone or the attendance record that fired it is what the church
     * came to do and it has to succeed either way. False when a person asked.
     */
    quiet?: boolean;
  },
): Promise<PipelineEntry | null> {
  const startedOn = day(input.on);

  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(
      and(
        isNull(pipelines.archivedAt),
        input.pipelineId ? eq(pipelines.id, input.pipelineId) : undefined,
        input.pipelineKey ? eq(pipelines.key, input.pipelineKey) : undefined,
      ),
    )
    .limit(1);
  if (!pipeline) {
    if (input.quiet !== false) return null;
    throw new InvalidInputError("followup.error.pipeline");
  }

  const [person] = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.id, input.personId))
    .limit(1);
  if (!person) throw new InvalidInputError("followup.error.person");

  // Already being followed up. Leave them where they are.
  const [open] = await db
    .select({ id: pipelineEntries.id })
    .from(pipelineEntries)
    .where(
      and(
        eq(pipelineEntries.pipelineId, pipeline.id),
        eq(pipelineEntries.personId, input.personId),
        eq(pipelineEntries.status, "open"),
      ),
    )
    .limit(1);
  if (open) return null;

  const [entry] = await db
    .insert(pipelineEntries)
    .values({
      tenantId,
      pipelineId: pipeline.id,
      personId: input.personId,
      startedOn,
      reason: input.reason ?? "by_hand",
    })
    .returning({ id: pipelineEntries.id });

  const steps = await db
    .select()
    .from(pipelineSteps)
    .where(eq(pipelineSteps.pipelineId, pipeline.id))
    .orderBy(asc(pipelineSteps.position));

  if (steps.length > 0) {
    await db.insert(followUps).values(
      steps.map((step) => ({
        tenantId,
        entryId: entry!.id,
        stepId: step.id,
        personId: input.personId,
        title: step.name,
        assigneeUserId: input.assigneeUserId ?? pipeline.ownerUserId ?? null,
        dueOn: addDays(startedOn, step.dueDays),
        position: step.position,
      })),
    );
  }

  return (await entriesWhere(db, eq(pipelineEntries.id, entry!.id)))[0] ?? null;
}

/** R5.4. Coming out, with the reason kept. */
export async function exitPipeline(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  input: { entryId: string; reason: string; done?: boolean },
): Promise<void> {
  if (!canFollowUp(actor.role)) throw new PermissionError(actor.role, "manageFollowUps");

  const reason = trim(input.reason);
  if (!reason) throw new InvalidInputError("followup.error.exitReason");

  const [entry] = await db
    .select({ id: pipelineEntries.id, status: pipelineEntries.status })
    .from(pipelineEntries)
    .where(eq(pipelineEntries.id, input.entryId))
    .limit(1);
  if (!entry) throw new InvalidInputError("followup.error.entry");
  if (entry.status !== "open") throw new InvalidInputError("followup.error.closed");

  await db
    .update(pipelineEntries)
    .set({
      status: input.done ? "done" : "left",
      exitReason: reason,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineEntries.id, input.entryId));
}

/** R5.1. A step answered, with what happened. */
export async function completeFollowUp(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string | null },
  input: { id: string; outcome?: string | null },
): Promise<void> {
  if (!canFollowUp(actor.role)) throw new PermissionError(actor.role, "manageFollowUps");

  const [task] = await db
    .select({ id: followUps.id, entryId: followUps.entryId, doneAt: followUps.doneAt })
    .from(followUps)
    .where(eq(followUps.id, input.id))
    .limit(1);
  if (!task) throw new InvalidInputError("followup.error.task");

  await db
    .update(followUps)
    .set({
      doneAt: task.doneAt ?? new Date(),
      doneByUserId: actor.userId ?? null,
      outcome: trim(input.outcome),
      updatedAt: new Date(),
    })
    .where(eq(followUps.id, input.id));

  // The last step answered closes the entry. A church that has done all three
  // things should not have to say so a fourth time.
  if (task.entryId) {
    const [left] = await db
      .select({ count: sql<string>`count(*)` })
      .from(followUps)
      .where(and(eq(followUps.entryId, task.entryId), isNull(followUps.doneAt)));
    if (Number(left?.count ?? 0) === 0) {
      await db
        .update(pipelineEntries)
        .set({ status: "done", closedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(pipelineEntries.id, task.entryId), eq(pipelineEntries.status, "open")));
    }
  }
}

/** R5.1. Undoing an answer, because somebody ticked the wrong line. */
export async function reopenFollowUp(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  id: string,
): Promise<void> {
  if (!canFollowUp(actor.role)) throw new PermissionError(actor.role, "manageFollowUps");

  const [task] = await db
    .select({ entryId: followUps.entryId })
    .from(followUps)
    .where(eq(followUps.id, id))
    .limit(1);
  if (!task) throw new InvalidInputError("followup.error.task");

  await db
    .update(followUps)
    .set({ doneAt: null, doneByUserId: null, outcome: null, updatedAt: new Date() })
    .where(eq(followUps.id, id));

  if (task.entryId) {
    await db
      .update(pipelineEntries)
      .set({ status: "open", closedAt: null, updatedAt: new Date() })
      .where(and(eq(pipelineEntries.id, task.entryId), eq(pipelineEntries.status, "done")));
  }
}

/** R5.6. A thing to do about somebody, attached to no pipeline. */
export async function addTask(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  input: {
    personId: string;
    title: string;
    assigneeUserId?: string | null;
    dueOn?: string | null;
  },
): Promise<FollowUp> {
  if (!canFollowUp(actor.role)) throw new PermissionError(actor.role, "manageFollowUps");

  const title = trim(input.title);
  if (!title) throw new InvalidInputError("followup.error.title");
  if (input.dueOn) day(input.dueOn);

  const [person] = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.id, input.personId))
    .limit(1);
  if (!person) throw new InvalidInputError("followup.error.person");

  const [row] = await db
    .insert(followUps)
    .values({
      tenantId: actor.tenantId,
      personId: input.personId,
      title,
      assigneeUserId: input.assigneeUserId ?? null,
      dueOn: input.dueOn ?? null,
    })
    .returning({ id: followUps.id });

  return (await tasksWhere(db, eq(followUps.id, row!.id)))[0]!;
}

async function tasksWhere(db: Tx, where: ReturnType<typeof eq>): Promise<FollowUp[]> {
  const rows = await db
    .select({
      id: followUps.id,
      personId: followUps.personId,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      title: followUps.title,
      entryId: followUps.entryId,
      assigneeUserId: followUps.assigneeUserId,
      dueOn: sql<string | null>`${followUps.dueOn}::text`,
      doneAt: followUps.doneAt,
      outcome: followUps.outcome,
      position: followUps.position,
      pipelineName: pipelines.name,
      pipelineHue: pipelines.hue,
    })
    .from(followUps)
    .innerJoin(people, eq(people.id, followUps.personId))
    .leftJoin(pipelineEntries, eq(pipelineEntries.id, followUps.entryId))
    .leftJoin(pipelines, eq(pipelines.id, pipelineEntries.pipelineId))
    .where(where)
    .orderBy(asc(followUps.dueOn), asc(followUps.position));

  return rows.map((row) => ({
    id: row.id,
    personId: row.personId,
    personName: called(row),
    title: row.title,
    pipelineName: row.pipelineName,
    pipelineHue: row.pipelineHue,
    entryId: row.entryId,
    assigneeUserId: row.assigneeUserId,
    dueOn: row.dueOn,
    doneAt: row.doneAt,
    outcome: row.outcome,
    position: row.position,
  }));
}

async function entriesWhere(db: Tx, where: ReturnType<typeof eq>): Promise<PipelineEntry[]> {
  const rows = await db
    .select({
      id: pipelineEntries.id,
      pipelineId: pipelineEntries.pipelineId,
      personId: pipelineEntries.personId,
      status: pipelineEntries.status,
      reason: pipelineEntries.reason,
      startedOn: sql<string>`${pipelineEntries.startedOn}::text`,
      exitReason: pipelineEntries.exitReason,
      key: pipelines.key,
      name: pipelines.name,
      hue: pipelines.hue,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
    })
    .from(pipelineEntries)
    .innerJoin(pipelines, eq(pipelines.id, pipelineEntries.pipelineId))
    .innerJoin(people, eq(people.id, pipelineEntries.personId))
    .where(where)
    .orderBy(desc(pipelineEntries.startedOn));
  if (rows.length === 0) return [];

  const steps = await tasksWhere(
    db,
    inArray(followUps.entryId, rows.map((row) => row.id)) as never,
  );

  return rows.map((row) => ({
    id: row.id,
    pipelineId: row.pipelineId,
    pipelineKey: row.key,
    pipelineName: row.name,
    pipelineHue: row.hue,
    personId: row.personId,
    personName: called(row),
    status: row.status,
    reason: row.reason,
    startedOn: row.startedOn,
    exitReason: row.exitReason,
    steps: steps.filter((step) => step.entryId === row.id),
  }));
}

/** R5.1. Where this person is up to, on their own record. */
export async function entriesFor(db: Tx, personId: string): Promise<PipelineEntry[]> {
  return entriesWhere(db, eq(pipelineEntries.personId, personId));
}

/** R5.6. Their loose tasks, which belong to no pipeline. */
export async function tasksFor(db: Tx, personId: string): Promise<FollowUp[]> {
  return tasksWhere(db, and(eq(followUps.personId, personId), isNull(followUps.entryId)) as never);
}

/**
 * R5.5. My follow-ups.
 *
 * Everything waiting on this person, overdue first. Sorted by the day it was
 * due rather than the day it was made, because the question is what is late.
 */
export async function myFollowUps(
  db: Tx,
  userId: string | null | undefined,
): Promise<FollowUp[]> {
  if (!userId) return [];
  return tasksWhere(
    db,
    and(eq(followUps.assigneeUserId, userId), isNull(followUps.doneAt)) as never,
  );
}

/** R5.5. Everything nobody has been given, so it is not quietly lost. */
export async function unassignedFollowUps(db: Tx): Promise<FollowUp[]> {
  return tasksWhere(
    db,
    and(isNull(followUps.assigneeUserId), isNull(followUps.doneAt)) as never,
  );
}

/** R5.1. Giving a step to somebody, or taking it back. */
export async function assignFollowUp(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  input: { id: string; assigneeUserId: string | null },
): Promise<void> {
  if (!canFollowUp(actor.role)) throw new PermissionError(actor.role, "manageFollowUps");
  await db
    .update(followUps)
    .set({ assigneeUserId: input.assigneeUserId, updatedAt: new Date() })
    .where(eq(followUps.id, input.id));
}

export interface PipelineCount {
  pipelineId: string;
  key: string;
  name: string;
  hue: string;
  open: number;
  overdue: number;
  /** R5.7. How long the people in it have been there, in days. */
  longestDays: number | null;
}

/**
 * R5.7. The board.
 *
 * How many are in each pipeline, how long the oldest has been waiting, and how
 * much of it is late. Three numbers, because a pastor looking at this wants to
 * know where the church is dropping people.
 */
export async function pipelineBoard(db: Tx, today: string): Promise<PipelineCount[]> {
  const rows = await db
    .select({
      pipelineId: pipelines.id,
      key: pipelines.key,
      name: pipelines.name,
      hue: pipelines.hue,
      position: pipelines.position,
      open: sql<string>`(
        select count(*) from pipeline_entries e
         where e.pipeline_id = pipelines.id and e.status = 'open'
      )`,
      overdue: sql<string>`(
        select count(distinct e.id) from pipeline_entries e
          join follow_ups f on f.entry_id = e.id
         where e.pipeline_id = pipelines.id
           and e.status = 'open'
           and f.done_at is null
           and f.due_on < ${today}::date
      )`,
      longest: sql<string | null>`(
        select max(${today}::date - e.started_on) from pipeline_entries e
         where e.pipeline_id = pipelines.id and e.status = 'open'
      )`,
    })
    .from(pipelines)
    .where(isNull(pipelines.archivedAt))
    .orderBy(asc(pipelines.position), asc(pipelines.name));

  return rows.map((row) => ({
    pipelineId: row.pipelineId,
    key: row.key,
    name: row.name,
    hue: row.hue,
    open: Number(row.open),
    overdue: Number(row.overdue),
    longestDays: row.longest === null ? null : Number(row.longest),
  }));
}

/** R5.7. Who is in one, oldest first, which is who has waited longest. */
export async function peopleIn(
  db: Tx,
  pipelineId: string,
  opts: { status?: string } = {},
): Promise<PipelineEntry[]> {
  return entriesWhere(
    db,
    and(
      eq(pipelineEntries.pipelineId, pipelineId),
      eq(pipelineEntries.status, opts.status ?? "open"),
    ) as never,
  );
}

/** Whether anybody has a pipeline open. Used by the triggers (R5.3). */
export async function isInPipeline(
  db: Tx,
  personId: string,
  key: PipelineKey,
): Promise<boolean> {
  const [row] = await db
    .select({ id: pipelineEntries.id })
    .from(pipelineEntries)
    .innerJoin(pipelines, eq(pipelines.id, pipelineEntries.pipelineId))
    .where(
      and(
        eq(pipelineEntries.personId, personId),
        eq(pipelines.key, key),
        eq(pipelineEntries.status, "open"),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/**
 * R5.3. The triggers.
 *
 * A church that has to remember to put a visitor on a list will not remember on
 * the week it matters. So the record itself raises the follow-up: a first
 * visit, a second visit, and three held services missed in a row.
 *
 * Counted from the attendance record each time rather than from a flag written
 * at the time, for the reason R7.5 gives: a flag is wrong the moment somebody
 * corrects a mistake or imports a year of history.
 *
 * Entering twice is what the skip rules below prevent, and they are the whole
 * difficulty here. A sweep that runs every day must not raise the same visitor
 * again tomorrow, and must raise them again if they drift a second time.
 */
export interface SweepResult {
  firstVisit: number;
  secondVisit: number;
  absent: number;
}

/** Whether this person has been in this pipeline since a given day. */
async function enteredSince(
  db: Tx,
  personId: string,
  key: PipelineKey,
  since: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: pipelineEntries.id })
    .from(pipelineEntries)
    .innerJoin(pipelines, eq(pipelines.id, pipelineEntries.pipelineId))
    .where(
      and(
        eq(pipelineEntries.personId, personId),
        eq(pipelines.key, key),
        sql`${pipelineEntries.startedOn} >= ${since}::date`,
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function sweepFollowUps(
  db: Tx,
  tenantId: string,
  opts: { today: string; days?: number; threshold?: number },
): Promise<SweepResult> {
  const today = day(opts.today);
  // A fortnight back, so a sweep that did not run for a week still catches up.
  const from = addDays(today, -(opts.days ?? 14));
  const result: SweepResult = { firstVisit: 0, secondVisit: 0, absent: 0 };

  const live = await db
    .select({ key: pipelines.key })
    .from(pipelines)
    .where(isNull(pipelines.archivedAt));
  const running = new Set(live.map((row) => row.key));

  for (const [visit, key] of [[1, "first_visit"], [2, "second_visit"]] as const) {
    if (!running.has(key)) continue;
    for (const visitor of await visitorsBetween(db, from, today, visit)) {
      // Their own visit day, so a sweep tomorrow sees the entry and stops.
      if (await enteredSince(db, visitor.personId, key, visitor.occursOn)) continue;
      const entered = await enterPipelineAuto(db, tenantId, {
        pipelineKey: key,
        personId: visitor.personId,
        on: visitor.occursOn,
        reason: key,
      });
      if (entered) result[visit === 1 ? "firstVisit" : "secondVisit"] += 1;
    }
  }

  if (running.has("absent")) {
    // R7.6. The church's own number for how many missed services it wants to
    // know about, rather than ours.
    const [church] = await db
      .select({ threshold: tenants.absenceThreshold })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const threshold = opts.threshold ?? church?.threshold ?? DEFAULT_ABSENCE_THRESHOLD;
    for (const person of await absentPeople(db, { threshold, asOf: today })) {
      // Dated from the last service they were at, so one spell raises one
      // follow-up however long it runs, and coming back then drifting again
      // raises another.
      if (await enteredSince(db, person.personId, "absent", person.lastSeenOn)) continue;
      const entered = await enterPipelineAuto(db, tenantId, {
        pipelineKey: "absent",
        personId: person.personId,
        on: today,
        reason: "absent",
      });
      if (entered) result.absent += 1;
    }
  }

  return result;
}

/** R5.3. The milestones that start a pipeline on their own. */
export const MILESTONE_PIPELINES: Record<string, PipelineKey> = {
  baptism: "baptism",
  membership_class: "membership",
};

/**
 * R5.3. A milestone added by hand raises the pipeline that goes with it.
 *
 * Recording a baptism is a church saying it is going to happen, so the steps
 * that lead to it are what the person recording it actually wanted.
 */
export async function pipelineForMilestone(
  db: Tx,
  tenantId: string,
  input: { personId: string; kind: string; on: string },
): Promise<void> {
  const key = MILESTONE_PIPELINES[input.kind];
  if (!key) return;
  if (await isInPipeline(db, input.personId, key)) return;
  await enterPipelineAuto(db, tenantId, {
    pipelineKey: key,
    personId: input.personId,
    on: input.on,
    reason: "milestone",
  });
}

/**
 * R5.2. Editing the six.
 *
 * A church renames a pipeline into its own words, rewrites a step, changes how
 * many days it gives itself, says who it lands on, and switches one off. What
 * it cannot do is invent a seventh or draw a branch, which is where R5.8 and a
 * workflow engine begin. That line is the reason this is usable.
 *
 * Editing the template never touches work in flight. Somebody already in the
 * pipeline keeps the steps that were written out for them, because a church
 * that rewords a step should not lose the three people it is already calling.
 */
export interface StepInput {
  id?: string;
  name: string;
  dueDays: number;
}

export async function updatePipeline(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  id: string,
  input: {
    name: string;
    description?: string | null;
    hue?: string;
    ownerUserId?: string | null;
    steps?: StepInput[];
  },
): Promise<Pipeline> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editPipelines");

  const name = trim(input.name);
  if (!name) throw new InvalidInputError("followup.error.name");

  const [existing] = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(eq(pipelines.id, id))
    .limit(1);
  if (!existing) throw new InvalidInputError("followup.error.pipeline");

  await db
    .update(pipelines)
    .set({
      name,
      description: trim(input.description),
      ...(input.hue ? { hue: input.hue } : {}),
      ownerUserId: input.ownerUserId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(pipelines.id, id));

  if (input.steps) await saveSteps(db, actor, id, input.steps);

  const [after] = (await listPipelines(db, { includeArchived: true })).filter((p) => p.id === id);
  return after!;
}

/** R5.2. The steps, in the order they are given, as the whole truth. */
export async function saveSteps(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  pipelineId: string,
  steps: StepInput[],
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editPipelines");
  if (steps.length === 0) throw new InvalidInputError("followup.error.steps");

  const clean = steps.map((step) => {
    const name = trim(step.name);
    if (!name) throw new InvalidInputError("followup.error.stepName");
    if (!Number.isInteger(step.dueDays) || step.dueDays < 0 || step.dueDays > 365) {
      throw new InvalidInputError("followup.error.dueDays");
    }
    return { id: step.id, name, dueDays: step.dueDays };
  });

  const existing = await db
    .select({ id: pipelineSteps.id })
    .from(pipelineSteps)
    .where(eq(pipelineSteps.pipelineId, pipelineId));

  const keeping = new Set(clean.map((step) => step.id).filter(Boolean) as string[]);
  for (const step of existing) {
    if (!keeping.has(step.id)) {
      await db.delete(pipelineSteps).where(eq(pipelineSteps.id, step.id));
    }
  }

  for (const [position, step] of clean.entries()) {
    if (step.id && existing.some((row) => row.id === step.id)) {
      await db
        .update(pipelineSteps)
        .set({ name: step.name, dueDays: step.dueDays, position, updatedAt: new Date() })
        .where(eq(pipelineSteps.id, step.id));
    } else {
      await db.insert(pipelineSteps).values({
        tenantId: actor.tenantId,
        pipelineId,
        name: step.name,
        dueDays: step.dueDays,
        position,
      });
    }
  }
}

/** R5.2. Switching one off. Nobody new enters it; the people in it stay. */
export async function setPipelineArchived(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editPipelines");
  await db
    .update(pipelines)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(pipelines.id, id));
}

/** R5.1. Who a church can hand a follow-up to: the accounts that work them. */
export async function assignableUsers(
  db: Tx,
): Promise<{ userId: string; name: string; role: string }[]> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select m.user_id, m.role, coalesce(nullif(u.full_name, ''), u.email) as name
      from tenant_members m
      join app_users u on u.id = m.user_id
     where m.tenant_id = app_tenant_id()
     order by name
  `);

  return (rows as unknown as Record<string, string>[])
    .filter((row) => CAN_FOLLOW_UP.includes(String(row["role"]) as TenantRole))
    .map((row) => ({
      userId: String(row["user_id"]),
      name: String(row["name"]),
      role: String(row["role"]),
    }));
}

/** R24.6. How many follow-ups are still open, for the count in the navigation. */
export async function countOpenFollowUps(db: Tx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(followUps)
    .where(sql`${followUps.doneAt} is null`);
  return row?.n ?? 0;
}
