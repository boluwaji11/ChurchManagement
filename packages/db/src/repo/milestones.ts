import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { Tx } from "../client";
import { milestones, members } from "../schema/members";
import { pipelineForMilestone } from "./followups";
import { canEditPeople, PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";

/**
 * R2.6. Milestones: dated, with notes.
 *
 * These are the dates a church is asked for and cannot produce. Who was
 * baptised last year. Which children were dedicated. When someone joined. They
 * sit on the person rather than in a note because R18 reports on them and the
 * pipelines in R5 start from them.
 */

export const MILESTONE_KINDS = [
  "first_visit", "salvation", "baptism", "confirmation",
  "child_dedication", "membership_class", "marriage", "death",
] as const;

export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export interface MilestoneView {
  id: string;
  memberId: string;
  kind: MilestoneKind;
  occurredOn: string;
  notes: string | null;
}

export interface MilestoneInput {
  memberId: string;
  kind: MilestoneKind;
  occurredOn: string;
  notes?: string | null;
}

export interface MilestoneResult extends MilestoneView {
  /** True when recording this milestone also changed the person's record. */
  updatedPerson: boolean;
}

/** Most recent first, which is the order somebody reads a life in. */
export async function listMilestones(db: Tx, memberId: string): Promise<MilestoneView[]> {
  const rows = await db
    .select({
      id: milestones.id,
      memberId: milestones.memberId,
      kind: milestones.kind,
      occurredOn: milestones.occurredOn,
      notes: milestones.notes,
    })
    .from(milestones)
    .where(eq(milestones.memberId, memberId))
    .orderBy(desc(milestones.occurredOn), asc(milestones.kind));

  return rows.map((r) => ({ ...r, kind: r.kind as MilestoneKind }));
}

/** Everyone who reached a milestone between two dates, for the reports in R18. */
export async function listMilestonesByKind(
  db: Tx,
  kind: MilestoneKind,
  from: string,
  to: string,
): Promise<(MilestoneView & { personName: string })[]> {
  const rows = await db
    .select({
      id: milestones.id,
      memberId: milestones.memberId,
      kind: milestones.kind,
      occurredOn: milestones.occurredOn,
      notes: milestones.notes,
      firstName: members.firstName,
      preferredName: members.preferredName,
      lastName: members.lastName,
    })
    .from(milestones)
    .innerJoin(members, eq(members.id, milestones.memberId))
    // Inclusive at both ends, which is what a church means by "baptisms in 2026".
    .where(and(
      eq(milestones.kind, kind),
      gte(milestones.occurredOn, from),
      lte(milestones.occurredOn, to),
    ))
    .orderBy(desc(milestones.occurredOn));

  return rows
    .map((r) => ({
      id: r.id,
      memberId: r.memberId,
      kind: r.kind as MilestoneKind,
      occurredOn: r.occurredOn,
      notes: r.notes,
      personName: `${r.preferredName ?? r.firstName} ${r.lastName}`,
    }));
}

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Records a milestone, and keeps the person's own record in step.
 *
 * Two milestones also live as columns on the person, because the directory and
 * the lifecycle filter read them on every page. A church that records a death
 * and is then asked to confirm the person is still a member has been failed by
 * its software, and the family gets the birthday email. So a death sets the
 * status, and a first visit fills the date if it was blank.
 */
export async function addMilestone(
  db: Tx,
  actor: WriteActor,
  input: MilestoneInput,
): Promise<MilestoneResult> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "addMilestone");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) {
    throw new InvalidInputError("milestone.error.date");
  }
  // A milestone is something that happened. A date in the future is a typo in
  // the year, every time.
  if (input.occurredOn > today()) throw new InvalidInputError("milestone.error.future");

  const [person] = await db
    .select({ id: members.id, firstVisitOn: members.firstVisitOn, status: members.lifecycleStatus })
    .from(members)
    .where(eq(members.id, input.memberId))
    .limit(1);
  if (!person) throw new InvalidInputError("error.notFound.person");

  const [row] = await db
    .insert(milestones)
    .values({
      tenantId: actor.tenantId,
      memberId: input.memberId,
      kind: input.kind,
      occurredOn: input.occurredOn,
      notes: input.notes?.trim() || null,
    })
    .returning({
      id: milestones.id,
      memberId: milestones.memberId,
      kind: milestones.kind,
      occurredOn: milestones.occurredOn,
      notes: milestones.notes,
    });

  let updatedPerson = false;

  if (input.kind === "death" && person.status !== "deceased") {
    await db
      .update(members)
      .set({ lifecycleStatus: "deceased", updatedAt: new Date() })
      .where(eq(members.id, input.memberId));
    updatedPerson = true;
  }

  // Only when it is blank. A church correcting a first visit date does it on
  // the person, and this must not undo that correction.
  if (input.kind === "first_visit" && person.firstVisitOn === null) {
    await db
      .update(members)
      .set({ firstVisitOn: input.occurredOn, updatedAt: new Date() })
      .where(eq(members.id, input.memberId));
    updatedPerson = true;
  }

  // R5.3. A baptism or a membership class raises the pipeline that leads to
  // it, because recording one is a church saying it is going to happen.
  await pipelineForMilestone(db, actor.tenantId, {
    memberId: input.memberId,
    kind: input.kind,
    on: input.occurredOn,
  });

  return { ...row!, kind: row!.kind as MilestoneKind, updatedPerson };
}

/**
 * Removes a milestone.
 *
 * The person's record is left as it is. Deleting a death record does not decide
 * that somebody is alive, and a status is a thing a person chooses on the
 * record itself.
 */
export async function removeMilestone(
  db: Tx,
  actor: WriteActor,
  id: string,
): Promise<{ removed: number }> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "removeMilestone");

  const gone = await db
    .delete(milestones)
    .where(eq(milestones.id, id))
    .returning({ id: milestones.id });

  if (gone.length === 0) throw new InvalidInputError("milestone.error.notFound");
  return { removed: gone.length };
}
