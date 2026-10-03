import { owner } from "../client";
import { InvalidInputError } from "../errors";

/**
 * R10.6. Answering a serving request without signing in.
 *
 * A volunteer gets a link. They press yes or no, and that is the whole
 * interaction. Asking somebody to make an account before they can say "I am
 * away that week" is how a church ends up chasing answers by text message and
 * keeping the real schedule in their head.
 *
 * The token in the link is the credential. It names one assignment, so whoever
 * holds it can answer that one request and see nothing else about the church.
 * It runs on the owner connection because there is no session to set a tenant
 * context from, the same as the join code in joining.ts.
 */

export interface ServingRequest {
  churchName: string;
  personName: string;
  teamName: string;
  positionName: string;
  serviceName: string;
  occursOn: string;
  startsAt: string;
  status: "pending" | "accepted" | "declined";
  declineReason: string | null;
  /** True once the gathering has been and gone, which closes the question. */
  past: boolean;
}

const TOKEN = /^[0-9a-f]{32}$/;

interface Row extends Omit<ServingRequest, "past" | "status"> {
  status: string;
  past: boolean;
}

/** What the link shows. Null for a token that names nothing. */
export async function servingRequestFor(token: string): Promise<ServingRequest | null> {
  if (!TOKEN.test(token)) return null;

  const sql = owner();
  const rows = await sql<Row[]>`
    select
      ten.name as "churchName",
      coalesce(p.preferred_name, p.first_name) || ' ' || p.last_name as "personName",
      tm.name as "teamName",
      tp.name as "positionName",
      so.name as "serviceName",
      so.occurs_on::text as "occursOn",
      so.starts_at as "startsAt",
      a.status as "status",
      a.decline_reason as "declineReason",
      so.occurs_on < current_date as "past"
    from serving_assignments a
      join tenants ten on ten.id = a.tenant_id
      join people p on p.id = a.person_id
      join teams tm on tm.id = a.team_id
      join team_positions tp on tp.id = a.position_id
      join service_occurrences so on so.id = a.occurrence_id
    where a.respond_token = ${token}
      and so.status = 'scheduled'
    limit 1`;

  const row = rows[0];
  if (!row) return null;
  return { ...row, status: row.status as ServingRequest["status"] };
}

export interface Answer {
  accept: boolean;
  /** R10.6. Optional, and only on a decline. */
  reason?: string | null;
}

/**
 * Records the answer.
 *
 * Changing it is allowed until the day passes, because somebody who says yes on
 * Monday and is ill on Thursday has to be able to say so, and the alternative
 * is a phone call to the one person who can edit the schedule.
 */
export async function answerServingRequest(
  token: string,
  answer: Answer,
): Promise<ServingRequest> {
  const request = await servingRequestFor(token);
  if (!request) throw new InvalidInputError("respond.error.unknown");
  if (request.past) throw new InvalidInputError("respond.error.past");

  const sql = owner();
  await sql`
    update serving_assignments
       set status = ${answer.accept ? "accepted" : "declined"},
           decline_reason = ${answer.accept ? null : (answer.reason?.trim() || null)},
           responded_at = now(),
           updated_at = now()
     where respond_token = ${token}`;

  return (await servingRequestFor(token))!;
}
