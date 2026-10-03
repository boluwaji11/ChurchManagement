import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { Tx } from "../client";
import {
  teams, teamPositions, teamMembers, teamMemberPositions,
  servingAssignments, blockoutDates, servingPreferences,
} from "../schema/serving";
import { serviceOccurrences } from "../schema/gatherings";
import { people } from "../schema/people";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageTeams, leadsTeam } from "./serving";
import type { WriteActor } from "./people";

/**
 * R10.3 to R10.5. The schedule: who is doing what, at which gathering.
 *
 * The schedule hangs off the service occurrence rather than off a date. A
 * church with two gatherings on one day runs two different bands, and a row
 * holding a date alone cannot say which one somebody is in.
 *
 * Reading across every team at once is the reason this is one system rather
 * than one per ministry. The person who leads worship is the person the kids
 * team was about to put in a room, and neither leader can see the other's
 * schedule. So the scheduler is shown where else somebody is at that hour.
 *
 * Serving in two places at one hour is allowed. R10.3 asked for it to be a
 * conflict; the church said somebody who runs the desk and reads a lesson in
 * the same service is doing what small churches do, and software that calls it
 * an error is wrong about the church rather than the other way round. So it is
 * information in the picker, and nothing is refused or flagged for it.
 *
 * What does warn is a day somebody said they are away, and a turn that comes
 * round sooner than they asked for. Both warn rather than refuse: somebody who
 * says yes in the corridor has already decided, and software that will not
 * record the decision is software a church works around.
 */

export const SERVING_FREQUENCIES = ["weekly", "fortnightly", "monthly", "quarterly"] as const;
export type ServingFrequency = (typeof SERVING_FREQUENCIES)[number];

/** Roughly how many days between turns, for the "served recently" warning. */
const GAP_DAYS: Record<ServingFrequency, number> = {
  weekly: 7, fortnightly: 14, monthly: 28, quarterly: 91,
};

export type AssignmentStatus = "asked" | "accepted" | "declined";

export interface Assignment {
  id: string;
  occurrenceId: string;
  teamId: string;
  positionId: string;
  positionName: string;
  personId: string;
  personName: string;
  status: AssignmentStatus;
  declineReason: string | null;
  overridden: boolean;
}

export interface Blockout {
  id: string;
  personId: string;
  startsOn: string;
  endsOn: string;
  reason: string | null;
}

/** Where else this person is at that hour. Information, not a warning. */
export interface Elsewhere {
  teamName: string;
  positionName: string;
}

/** Why the scheduler was warned, if they were. */
export interface Warning {
  /** R10.4. They said they are away. */
  blockedOut: { startsOn: string; endsOn: string; reason: string | null } | null;
  /** R10.5. They served more recently than their preference asks for. */
  tooSoon: { lastServedOn: string; frequency: ServingFrequency } | null;
}

export interface PlanCandidate {
  personId: string;
  name: string;
  /** True when they are marked as playing this position. */
  plays: boolean;
  lastServedOn: string | null;
  frequency: ServingFrequency | null;
  warning: Warning;
  alsoOn: Elsewhere | null;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clean = (warning: Warning): boolean =>
  warning.blockedOut === null && warning.tooSoon === null;

const displayName = (r: { firstName: string; preferredName: string | null; lastName: string }) =>
  `${r.preferredName ?? r.firstName} ${r.lastName}`;

/** Thrown when the scheduler has not said to go ahead anyway. */
export class ScheduleConflictError extends Error {
  readonly warning: Warning;
  constructor(warning: Warning) {
    super("That person is away, or due a break.");
    this.name = "ScheduleConflictError";
    this.warning = warning;
  }
}

async function mayScheduleFor(db: Tx, actor: WriteActor, teamId: string): Promise<void> {
  if (canManageTeams(actor.role)) return;
  if (actor.role === "team_leader" && actor.userId && await leadsTeam(db, teamId, actor.userId)) {
    return;
  }
  throw new PermissionError(actor.role, "schedule");
}

/** R10.3. The gatherings this schedule covers, soonest first. */
export async function upcomingServices(
  db: Tx,
  options: { from: string; limit?: number },
): Promise<{ id: string; name: string; occursOn: string; startsAt: string }[]> {
  return db
    .select({
      id: serviceOccurrences.id,
      name: serviceOccurrences.name,
      occursOn: sql<string>`${serviceOccurrences.occursOn}::text`,
      startsAt: serviceOccurrences.startsAt,
    })
    .from(serviceOccurrences)
    .where(and(
      gte(serviceOccurrences.occursOn, options.from),
      eq(serviceOccurrences.status, "scheduled"),
    ))
    .orderBy(asc(serviceOccurrences.occursOn), asc(serviceOccurrences.startsAt))
    .limit(options.limit ?? 6);
}

/** R10.3. Everyone scheduled on this team across these gatherings. */
export async function assignmentsForTeam(
  db: Tx,
  teamId: string,
  occurrenceIds: string[],
): Promise<Assignment[]> {
  if (occurrenceIds.length === 0) return [];

  const rows = await db
    .select({
      id: servingAssignments.id,
      occurrenceId: servingAssignments.occurrenceId,
      teamId: servingAssignments.teamId,
      positionId: servingAssignments.positionId,
      positionName: teamPositions.name,
      personId: servingAssignments.personId,
      status: servingAssignments.status,
      declineReason: servingAssignments.declineReason,
      overridden: servingAssignments.overridden,
      order: teamPositions.position,
      firstName: people.firstName,
      preferredName: people.preferredName,
      lastName: people.lastName,
    })
    .from(servingAssignments)
    .innerJoin(teamPositions, eq(teamPositions.id, servingAssignments.positionId))
    .innerJoin(people, eq(people.id, servingAssignments.personId))
    .where(and(
      eq(servingAssignments.teamId, teamId),
      inArray(servingAssignments.occurrenceId, occurrenceIds),
    ))
    .orderBy(asc(teamPositions.position), asc(people.lastName));

  return rows.map((r) => ({
    id: r.id,
    occurrenceId: r.occurrenceId,
    teamId: r.teamId,
    positionId: r.positionId,
    positionName: r.positionName,
    personId: r.personId,
    personName: displayName(r),
    status: r.status as AssignmentStatus,
    declineReason: r.declineReason,
    overridden: r.overridden,
  }));
}

/** R10.3. Everything one person is down for, soonest first. */
export async function assignmentsForPerson(
  db: Tx,
  personId: string,
  options: { from?: string; limit?: number } = {},
): Promise<(Assignment & { teamName: string; occursOn: string; startsAt: string; serviceName: string })[]> {
  const rows = await db
    .select({
      id: servingAssignments.id,
      occurrenceId: servingAssignments.occurrenceId,
      teamId: servingAssignments.teamId,
      teamName: teams.name,
      positionId: servingAssignments.positionId,
      positionName: teamPositions.name,
      personId: servingAssignments.personId,
      status: servingAssignments.status,
      declineReason: servingAssignments.declineReason,
      overridden: servingAssignments.overridden,
      serviceName: serviceOccurrences.name,
      occursOn: sql<string>`${serviceOccurrences.occursOn}::text`,
      startsAt: serviceOccurrences.startsAt,
      firstName: people.firstName,
      preferredName: people.preferredName,
      lastName: people.lastName,
    })
    .from(servingAssignments)
    .innerJoin(teams, eq(teams.id, servingAssignments.teamId))
    .innerJoin(teamPositions, eq(teamPositions.id, servingAssignments.positionId))
    .innerJoin(people, eq(people.id, servingAssignments.personId))
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servingAssignments.occurrenceId))
    .where(and(
      eq(servingAssignments.personId, personId),
      options.from ? gte(serviceOccurrences.occursOn, options.from) : undefined,
    ))
    .orderBy(asc(serviceOccurrences.occursOn), asc(serviceOccurrences.startsAt))
    .limit(options.limit ?? 20);

  return rows.map((r) => ({
    id: r.id,
    occurrenceId: r.occurrenceId,
    teamId: r.teamId,
    teamName: r.teamName,
    positionId: r.positionId,
    positionName: r.positionName,
    personId: r.personId,
    personName: displayName(r),
    status: r.status as AssignmentStatus,
    declineReason: r.declineReason,
    overridden: r.overridden,
    serviceName: r.serviceName,
    occursOn: r.occursOn,
    startsAt: r.startsAt,
  }));
}

/**
 * R10.3. What a scheduler should know before putting this person here.
 *
 * Three questions, in the order a leader would ask them: where else are they at
 * that hour, have they said they are away, and did they serve more recently
 * than they asked to. Only the last two are warnings.
 */
export async function checkFor(
  db: Tx,
  input: { personId: string; occurrenceId: string },
): Promise<{ warning: Warning; alsoOn: Elsewhere | null }> {
  const [occurrence] = await db
    .select({
      occursOn: sql<string>`${serviceOccurrences.occursOn}::text`,
      startsAt: serviceOccurrences.startsAt,
    })
    .from(serviceOccurrences)
    .where(eq(serviceOccurrences.id, input.occurrenceId))
    .limit(1);
  if (!occurrence) throw new InvalidInputError("schedule.error.occurrence");

  // Across every team, which is the whole reason the schedule is one system.
  const [elsewhere] = await db
    .select({ teamName: teams.name, positionName: teamPositions.name })
    .from(servingAssignments)
    .innerJoin(teams, eq(teams.id, servingAssignments.teamId))
    .innerJoin(teamPositions, eq(teamPositions.id, servingAssignments.positionId))
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servingAssignments.occurrenceId))
    .where(and(
      eq(servingAssignments.personId, input.personId),
      sql`${servingAssignments.status} <> 'declined'`,
      sql`${serviceOccurrences.occursOn}::text = ${occurrence.occursOn}`,
      eq(serviceOccurrences.startsAt, occurrence.startsAt),
    ))
    .limit(1);

  const [away] = await db
    .select({
      startsOn: sql<string>`${blockoutDates.startsOn}::text`,
      endsOn: sql<string>`${blockoutDates.endsOn}::text`,
      reason: blockoutDates.reason,
    })
    .from(blockoutDates)
    .where(and(
      eq(blockoutDates.personId, input.personId),
      lte(blockoutDates.startsOn, occurrence.occursOn),
      gte(blockoutDates.endsOn, occurrence.occursOn),
    ))
    .limit(1);

  const [preference] = await db
    .select({ frequency: servingPreferences.frequency })
    .from(servingPreferences)
    .where(eq(servingPreferences.personId, input.personId))
    .limit(1);

  let tooSoon: Warning["tooSoon"] = null;
  if (preference) {
    const frequency = preference.frequency as ServingFrequency;
    const gap = GAP_DAYS[frequency] ?? 0;

    const [last] = await db
      .select({ on: sql<string>`${serviceOccurrences.occursOn}::text` })
      .from(servingAssignments)
      .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servingAssignments.occurrenceId))
      .where(and(
        eq(servingAssignments.personId, input.personId),
        sql`${servingAssignments.status} <> 'declined'`,
        sql`${serviceOccurrences.occursOn}::text < ${occurrence.occursOn}`,
      ))
      .orderBy(desc(serviceOccurrences.occursOn))
      .limit(1);

    if (last) {
      const since = Math.round(
        (Date.parse(`${occurrence.occursOn}T00:00:00Z`) - Date.parse(`${last.on}T00:00:00Z`))
        / 86_400_000,
      );
      if (since < gap) tooSoon = { lastServedOn: last.on, frequency };
    }
  }

  return {
    warning: { blockedOut: away ?? null, tooSoon },
    alsoOn: elsewhere ?? null,
  };
}

/**
 * R10.3 to R10.5. Who could fill this position at this gathering, and what the
 * scheduler should know about each of them.
 */
export async function candidatesFor(
  db: Tx,
  input: { teamId: string; positionId: string; occurrenceId: string },
): Promise<PlanCandidate[]> {
  const roster = await db
    .select({
      memberId: teamMembers.id,
      personId: teamMembers.personId,
      firstName: people.firstName,
      preferredName: people.preferredName,
      lastName: people.lastName,
    })
    .from(teamMembers)
    .innerJoin(people, eq(people.id, teamMembers.personId))
    .where(and(
      eq(teamMembers.teamId, input.teamId),
      isNull(teamMembers.leftOn),
      isNull(people.archivedAt),
    ))
    .orderBy(asc(people.lastName), asc(people.firstName));

  if (roster.length === 0) return [];

  const plays = await db
    .select({ memberId: teamMemberPositions.memberId })
    .from(teamMemberPositions)
    .where(and(
      eq(teamMemberPositions.positionId, input.positionId),
      inArray(teamMemberPositions.memberId, roster.map((r) => r.memberId)),
    ));
  const playing = new Set(plays.map((p) => p.memberId));

  const preferences = await db
    .select({ personId: servingPreferences.personId, frequency: servingPreferences.frequency })
    .from(servingPreferences)
    .where(inArray(servingPreferences.personId, roster.map((r) => r.personId)));
  const byPerson = new Map(preferences.map((p) => [p.personId, p.frequency as ServingFrequency]));

  const out: PlanCandidate[] = [];
  for (const person of roster) {
    const { warning, alsoOn } = await checkFor(db, {
      personId: person.personId,
      occurrenceId: input.occurrenceId,
    });
    out.push({
      personId: person.personId,
      name: displayName(person),
      plays: playing.has(person.memberId),
      lastServedOn: warning.tooSoon?.lastServedOn ?? null,
      frequency: byPerson.get(person.personId) ?? null,
      warning,
      alsoOn,
    });
  }

  // Whoever plays the position and has nothing against them, first.
  return out.sort((a, b) =>
    Number(b.plays) - Number(a.plays)
    || Number(clean(b.warning)) - Number(clean(a.warning))
    || a.name.localeCompare(b.name));
}

export interface AssignInput {
  occurrenceId: string;
  teamId: string;
  positionId: string;
  personId: string;
  /** True when the scheduler has read the warning and gone ahead. */
  anyway?: boolean;
}

/**
 * R10.3. Puts somebody down.
 *
 * Refuses once where they are away or due a break, then records that it was
 * told to go ahead. Being on another team at the same hour is not refused.
 */
export async function assign(
  db: Tx,
  actor: WriteActor,
  input: AssignInput,
): Promise<{ id: string; overridden: boolean }> {
  await mayScheduleFor(db, actor, input.teamId);

  const [position] = await db
    .select({ id: teamPositions.id })
    .from(teamPositions)
    .where(and(
      eq(teamPositions.id, input.positionId),
      eq(teamPositions.teamId, input.teamId),
      isNull(teamPositions.archivedAt),
    ))
    .limit(1);
  if (!position) throw new InvalidInputError("schedule.error.position");

  const { warning } = await checkFor(db, {
    personId: input.personId,
    occurrenceId: input.occurrenceId,
  });
  const warned = !clean(warning);
  if (warned && !input.anyway) throw new ScheduleConflictError(warning);

  const [row] = await db
    .insert(servingAssignments)
    .values({
      tenantId: actor.tenantId,
      occurrenceId: input.occurrenceId,
      teamId: input.teamId,
      positionId: input.positionId,
      personId: input.personId,
      overridden: warned,
    })
    .onConflictDoNothing()
    .returning({ id: servingAssignments.id });

  if (!row) throw new InvalidInputError("schedule.error.already");
  return { id: row.id, overridden: warned };
}

/** R10.3. Takes somebody off. The slot goes back to empty. */
export async function unassign(db: Tx, actor: WriteActor, id: string): Promise<void> {
  const [row] = await db
    .select({ teamId: servingAssignments.teamId })
    .from(servingAssignments)
    .where(eq(servingAssignments.id, id))
    .limit(1);
  if (!row) throw new InvalidInputError("schedule.error.missing");

  await mayScheduleFor(db, actor, row.teamId);
  await db.delete(servingAssignments).where(eq(servingAssignments.id, id));
}

// ---------------------------------------------------------------------------
// R10.4. Blockout dates
// ---------------------------------------------------------------------------

export async function listBlockouts(
  db: Tx,
  personId: string,
  options: { from?: string } = {},
): Promise<Blockout[]> {
  return db
    .select({
      id: blockoutDates.id,
      personId: blockoutDates.personId,
      startsOn: sql<string>`${blockoutDates.startsOn}::text`,
      endsOn: sql<string>`${blockoutDates.endsOn}::text`,
      reason: blockoutDates.reason,
    })
    .from(blockoutDates)
    .where(and(
      eq(blockoutDates.personId, personId),
      options.from ? gte(blockoutDates.endsOn, options.from) : undefined,
    ))
    .orderBy(asc(blockoutDates.startsOn));
}

export async function addBlockout(
  db: Tx,
  actor: WriteActor,
  input: { personId: string; startsOn: string; endsOn: string; reason?: string | null },
): Promise<{ id: string }> {
  if (!ISO.test(input.startsOn) || !ISO.test(input.endsOn)) {
    throw new InvalidInputError("blockout.error.date");
  }
  if (input.endsOn < input.startsOn) throw new InvalidInputError("blockout.error.order");

  const [row] = await db
    .insert(blockoutDates)
    .values({
      tenantId: actor.tenantId,
      personId: input.personId,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      reason: input.reason?.trim() || null,
    })
    .returning({ id: blockoutDates.id });

  return { id: row!.id };
}

export async function removeBlockout(db: Tx, _actor: WriteActor, id: string): Promise<void> {
  const gone = await db
    .delete(blockoutDates)
    .where(eq(blockoutDates.id, id))
    .returning({ id: blockoutDates.id });
  if (gone.length === 0) throw new InvalidInputError("blockout.error.missing");
}

// ---------------------------------------------------------------------------
// R10.5. How often somebody wants to serve
// ---------------------------------------------------------------------------

export async function getServingPreference(
  db: Tx,
  personId: string,
): Promise<ServingFrequency | null> {
  const [row] = await db
    .select({ frequency: servingPreferences.frequency })
    .from(servingPreferences)
    .where(eq(servingPreferences.personId, personId))
    .limit(1);
  return (row?.frequency as ServingFrequency) ?? null;
}

export async function setServingPreference(
  db: Tx,
  actor: WriteActor,
  input: { personId: string; frequency: ServingFrequency | null },
): Promise<void> {
  if (input.frequency === null) {
    await db.delete(servingPreferences).where(eq(servingPreferences.personId, input.personId));
    return;
  }
  if (!SERVING_FREQUENCIES.includes(input.frequency)) {
    throw new InvalidInputError("preference.error.frequency");
  }

  await db
    .insert(servingPreferences)
    .values({
      tenantId: actor.tenantId,
      personId: input.personId,
      frequency: input.frequency,
    })
    .onConflictDoUpdate({
      target: servingPreferences.personId,
      set: { frequency: input.frequency, updatedAt: new Date() },
    });
}
