import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { owner } from "../client";
import type { Tx } from "../client";
import {
  teams, teamPositions, servingAssignments, substituteRequests,
} from "../schema/serving";
import { serviceOccurrences } from "../schema/gatherings";
import { people } from "../schema/people";
import { InvalidInputError } from "../errors";
import { PermissionError } from "../roles";
import { canManageTeams, leadsTeam } from "./serving";
import { assign, candidatesFor, type PlanCandidate } from "./schedule";
import type { WriteActor } from "./people";

/**
 * R10.7. A swap.
 *
 * Somebody who cannot make it asks, the system offers names, and a leader
 * decides. The deciding stays with the leader because who covers the sound desk
 * is a judgement about people, and a church that found its drummer replaced
 * overnight by an algorithm would stop trusting the schedule.
 *
 * Asking runs from the same link the answer runs from, so it needs no sign-in.
 */

export type SubstituteStatus = "open" | "filled" | "withdrawn" | "cancelled";

export interface SubstituteRequest {
  id: string;
  assignmentId: string;
  occurrenceId: string;
  teamId: string;
  teamName: string;
  positionId: string;
  positionName: string;
  personId: string;
  personName: string;
  reason: string | null;
  status: SubstituteStatus;
  filledByName: string | null;
}

const TOKEN = /^[0-9a-f]{32}$/;

const displayName = (r: { firstName: string; preferredName: string | null; lastName: string }) =>
  `${r.preferredName ?? r.firstName} ${r.lastName}`;

/**
 * R10.7. Asked for from the answer link, with no sign-in.
 *
 * Asking also says no to the request, because somebody looking for a swap has
 * already told the church they cannot make it. Leaving them down as "asked"
 * would leave the position looking filled.
 */
export async function askForSubstitute(
  token: string,
  reason?: string | null,
): Promise<{ status: SubstituteStatus }> {
  if (!TOKEN.test(token)) throw new InvalidInputError("respond.error.unknown");

  const sql2 = owner();
  const rows = await sql2<{ id: string; tenantId: string; past: boolean }[]>`
    select a.id, a.tenant_id as "tenantId", so.occurs_on < current_date as "past"
      from serving_assignments a
      join service_occurrences so on so.id = a.occurrence_id
     where a.respond_token = ${token}
       and so.status = 'scheduled'
     limit 1`;

  const row = rows[0];
  if (!row) throw new InvalidInputError("respond.error.unknown");
  if (row.past) throw new InvalidInputError("respond.error.past");

  await sql2`
    update serving_assignments
       set status = 'declined',
           decline_reason = ${reason?.trim() || null},
           responded_at = now(),
           updated_at = now()
     where id = ${row.id}`;

  await sql2`
    insert into substitute_requests (tenant_id, assignment_id, reason)
    values (${row.tenantId}, ${row.id}, ${reason?.trim() || null})
    on conflict do nothing`;

  return { status: "open" };
}

/** R10.7. The volunteer changes their mind about asking. */
export async function withdrawSubstitute(token: string): Promise<void> {
  if (!TOKEN.test(token)) throw new InvalidInputError("respond.error.unknown");

  const sql2 = owner();
  await sql2`
    update substitute_requests r
       set status = 'withdrawn', decided_at = now(), updated_at = now()
      from serving_assignments a
     where a.id = r.assignment_id
       and a.respond_token = ${token}
       and r.status = 'open'`;
}

/** R10.7. Whether this link already has a swap open on it. */
export async function substituteStatusFor(token: string): Promise<SubstituteStatus | null> {
  if (!TOKEN.test(token)) return null;

  const sql2 = owner();
  const rows = await sql2<{ status: string }[]>`
    select r.status
      from substitute_requests r
      join serving_assignments a on a.id = r.assignment_id
     where a.respond_token = ${token}
     order by r.created_at desc
     limit 1`;

  return (rows[0]?.status as SubstituteStatus) ?? null;
}

const REQUEST_COLUMNS = {
  id: substituteRequests.id,
  assignmentId: substituteRequests.assignmentId,
  occurrenceId: servingAssignments.occurrenceId,
  teamId: servingAssignments.teamId,
  teamName: teams.name,
  positionId: servingAssignments.positionId,
  positionName: teamPositions.name,
  personId: servingAssignments.personId,
  reason: substituteRequests.reason,
  status: substituteRequests.status,
  firstName: people.firstName,
  preferredName: people.preferredName,
  lastName: people.lastName,
  filledBy: substituteRequests.filledByPersonId,
};

/** R10.7. Swaps waiting on a leader, for the gatherings given. */
export async function openSubstitutes(
  db: Tx,
  options: { teamId?: string; occurrenceIds?: string[] } = {},
): Promise<SubstituteRequest[]> {
  if (options.occurrenceIds?.length === 0) return [];

  const rows = await db
    .select(REQUEST_COLUMNS)
    .from(substituteRequests)
    .innerJoin(servingAssignments, eq(servingAssignments.id, substituteRequests.assignmentId))
    .innerJoin(teams, eq(teams.id, servingAssignments.teamId))
    .innerJoin(teamPositions, eq(teamPositions.id, servingAssignments.positionId))
    .innerJoin(people, eq(people.id, servingAssignments.personId))
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servingAssignments.occurrenceId))
    .where(and(
      eq(substituteRequests.status, "open"),
      options.teamId ? eq(servingAssignments.teamId, options.teamId) : undefined,
      options.occurrenceIds
        ? inArray(servingAssignments.occurrenceId, options.occurrenceIds)
        : undefined,
    ))
    .orderBy(asc(serviceOccurrences.occursOn), asc(teamPositions.position));

  return rows.map((r) => ({
    id: r.id,
    assignmentId: r.assignmentId,
    occurrenceId: r.occurrenceId,
    teamId: r.teamId,
    teamName: r.teamName,
    positionId: r.positionId,
    positionName: r.positionName,
    personId: r.personId,
    personName: displayName(r),
    reason: r.reason,
    status: r.status as SubstituteStatus,
    filledByName: null,
  }));
}

/**
 * R10.7. Who could cover, with the same warnings the scheduler already reads.
 *
 * The person who asked is left out, and so is anybody already down for that
 * position at that gathering.
 */
export async function coverFor(db: Tx, requestId: string): Promise<PlanCandidate[]> {
  const [request] = await db
    .select({
      teamId: servingAssignments.teamId,
      positionId: servingAssignments.positionId,
      occurrenceId: servingAssignments.occurrenceId,
      personId: servingAssignments.personId,
    })
    .from(substituteRequests)
    .innerJoin(servingAssignments, eq(servingAssignments.id, substituteRequests.assignmentId))
    .where(eq(substituteRequests.id, requestId))
    .limit(1);
  if (!request) throw new InvalidInputError("substitute.error.missing");

  const taken = await db
    .select({ personId: servingAssignments.personId })
    .from(servingAssignments)
    .where(and(
      eq(servingAssignments.occurrenceId, request.occurrenceId),
      eq(servingAssignments.positionId, request.positionId),
      sql`${servingAssignments.status} <> 'declined'`,
    ));
  const already = new Set([request.personId, ...taken.map((t) => t.personId)]);

  const found = await candidatesFor(db, {
    teamId: request.teamId,
    positionId: request.positionId,
    occurrenceId: request.occurrenceId,
  });

  return found.filter((candidate) => !already.has(candidate.personId));
}

/**
 * R10.7. The leader puts somebody in, which closes the request.
 *
 * The original assignment stays, declined, because "she asked for a swap and
 * Ada covered" is the history worth keeping and deleting the row loses it.
 */
export async function fillSubstitute(
  db: Tx,
  actor: WriteActor,
  input: { requestId: string; personId: string; anyway?: boolean },
): Promise<void> {
  const [request] = await db
    .select({
      teamId: servingAssignments.teamId,
      positionId: servingAssignments.positionId,
      occurrenceId: servingAssignments.occurrenceId,
      status: substituteRequests.status,
    })
    .from(substituteRequests)
    .innerJoin(servingAssignments, eq(servingAssignments.id, substituteRequests.assignmentId))
    .where(eq(substituteRequests.id, input.requestId))
    .limit(1);
  if (!request) throw new InvalidInputError("substitute.error.missing");
  if (request.status !== "open") throw new InvalidInputError("substitute.error.closed");

  await mayDecide(db, actor, request.teamId);

  await assign(db, actor, {
    occurrenceId: request.occurrenceId,
    teamId: request.teamId,
    positionId: request.positionId,
    personId: input.personId,
    anyway: input.anyway,
  });

  await db
    .update(substituteRequests)
    .set({
      status: "filled",
      filledByPersonId: input.personId,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(substituteRequests.id, input.requestId));
}

/** R10.7. The leader closes it without a swap: they will handle it themselves. */
export async function cancelSubstitute(
  db: Tx,
  actor: WriteActor,
  requestId: string,
): Promise<void> {
  const [request] = await db
    .select({ teamId: servingAssignments.teamId })
    .from(substituteRequests)
    .innerJoin(servingAssignments, eq(servingAssignments.id, substituteRequests.assignmentId))
    .where(eq(substituteRequests.id, requestId))
    .limit(1);
  if (!request) throw new InvalidInputError("substitute.error.missing");

  await mayDecide(db, actor, request.teamId);

  await db
    .update(substituteRequests)
    .set({ status: "cancelled", decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(substituteRequests.id, requestId));
}

async function mayDecide(db: Tx, actor: WriteActor, teamId: string): Promise<void> {
  if (canManageTeams(actor.role)) return;
  if (actor.role === "team_leader" && actor.userId && await leadsTeam(db, teamId, actor.userId)) {
    return;
  }
  throw new PermissionError(actor.role, "schedule");
}

/** R10.6. How a team's schedule stands: asked, accepted, declined. */
export interface AnswerCounts {
  asked: number;
  accepted: number;
  declined: number;
  substitutes: number;
}

export async function answerCounts(
  db: Tx,
  options: { teamIds: string[]; from: string },
): Promise<Record<string, AnswerCounts>> {
  if (options.teamIds.length === 0) return {};

  const rows = await db
    .select({
      teamId: servingAssignments.teamId,
      status: servingAssignments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(servingAssignments)
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servingAssignments.occurrenceId))
    .where(and(
      inArray(servingAssignments.teamId, options.teamIds),
      sql`${serviceOccurrences.occursOn}::text >= ${options.from}`,
      eq(serviceOccurrences.status, "scheduled"),
    ))
    .groupBy(servingAssignments.teamId, servingAssignments.status);

  const swaps = await db
    .select({
      teamId: servingAssignments.teamId,
      count: sql<number>`count(*)::int`,
    })
    .from(substituteRequests)
    .innerJoin(servingAssignments, eq(servingAssignments.id, substituteRequests.assignmentId))
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servingAssignments.occurrenceId))
    .where(and(
      inArray(servingAssignments.teamId, options.teamIds),
      eq(substituteRequests.status, "open"),
      sql`${serviceOccurrences.occursOn}::text >= ${options.from}`,
    ))
    .groupBy(servingAssignments.teamId);

  const out: Record<string, AnswerCounts> = {};
  for (const id of options.teamIds) {
    out[id] = { asked: 0, accepted: 0, declined: 0, substitutes: 0 };
  }
  for (const row of rows) {
    const bucket = out[row.teamId];
    if (!bucket) continue;
    if (row.status === "accepted") bucket.accepted += row.count;
    else if (row.status === "declined") bucket.declined += row.count;
    else bucket.asked += row.count;
  }
  for (const row of swaps) {
    const bucket = out[row.teamId];
    if (bucket) bucket.substitutes = row.count;
  }
  return out;
}
