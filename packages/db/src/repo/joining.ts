/**
 * R1.7, R22.1. How somebody who is not staff gets an account.
 *
 * The order is church, then people, then accounts. A church exists first. People
 * are records the church made, by import, by a form, at a check-in desk or by
 * hand. An account claims one of those records, and the proof is an address the
 * church already wrote down.
 *
 * So a join is a match, not a registration. The church gave somebody a link, and
 * the only question is whether the address they signed up with is already on the
 * church's records. It is, and they are a member in one step with nobody asked
 * to do anything. It is not, and they are a visitor on the records and wait,
 * because a member can read group rosters and a forwarded link is not a
 * congregation.
 *
 * Everything here before the membership exists runs on the owner connection, as
 * the rest of membership.ts does. There is no tenant context to set for somebody
 * who is not yet in the tenant.
 */
import { and, desc, eq, isNull, sql as raw } from "drizzle-orm";
import { owner } from "../client";
import type { Tx } from "../client";
import { joinRequests } from "../schema/invitations";
import { people } from "../schema/people";
import { InvalidInputError } from "../errors";
import { PermissionError, type TenantRole } from "../roles";
import { canManageChurch } from "./church";

/**
 * No O, I, L, 0 or 1. The code is read off a printed card by somebody who left
 * their glasses at home, and those five are where that goes wrong.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** Uppercase, letters and digits only, so "river-4x2k" and "RIVER 4X2K" both work. */
export function normaliseJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Written as two groups of four, which is how a person reads a code aloud. */
export function formatJoinCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function newCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export interface JoinTarget {
  tenantId: string;
  slug: string;
  name: string;
}

/** The church a code belongs to, or null. Runs before anybody is anybody. */
export async function churchForJoinCode(code: string): Promise<JoinTarget | null> {
  const value = normaliseJoinCode(code);
  if (value.length !== CODE_LENGTH) return null;

  const sql = owner();
  const rows = await sql<JoinTarget[]>`
    select id as "tenantId", slug, name from tenants
    where join_code = ${value} and demo_expires_at is null
    limit 1`;
  return rows[0] ?? null;
}

/** R1.7. The code a church hands out. Rotating it stops every card already printed. */
export async function rotateJoinCode(
  tenantId: string,
  role: TenantRole,
): Promise<string> {
  if (!canManageChurch(role)) throw new PermissionError(role, "editChurch");

  const sql = owner();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = newCode();
    const rows = await sql<{ join_code: string }[]>`
      update tenants set join_code = ${code}
      where id = ${tenantId}
        and not exists (select 1 from tenants where join_code = ${code})
      returning join_code`;
    if (rows[0]) return rows[0].join_code;
  }
  throw new Error("Could not find an unused join code.");
}

/** Switching joining off. Every card stops working and nothing else changes. */
export async function closeJoining(tenantId: string, role: TenantRole): Promise<void> {
  if (!canManageChurch(role)) throw new PermissionError(role, "editChurch");
  const sql = owner();
  await sql`update tenants set join_code = null where id = ${tenantId}`;
}

export type JoinOutcome =
  /** Their address was on the church's records. They are a member. */
  | { status: "joined"; slug: string; name: string }
  /** They were already one. */
  | { status: "member"; slug: string; name: string }
  /** The church has to say yes. */
  | { status: "waiting"; name: string };

/**
 * R1.7. Going through the door.
 *
 * One transaction, because a half-finished join is somebody holding a record
 * they cannot reach or a membership pointing at nothing.
 *
 * A child's record is never claimable, whoever the address belongs to. A record
 * somebody else has already claimed is not claimable either: that is either a
 * shared mailbox or a mistake, and both want a person to look.
 */
export async function joinWithCode(input: {
  code: string;
  user: { id: string; email: string; fullName?: string | null; emailVerified: boolean };
}): Promise<JoinOutcome> {
  if (!input.user.emailVerified) throw new InvalidInputError("error.emailUnverified");

  const target = await churchForJoinCode(input.code);
  if (!target) throw new InvalidInputError("join.error.code");

  const email = input.user.email.trim().toLowerCase();
  const fullName = input.user.fullName?.trim() || null;
  const sql = owner();

  return sql.begin(async (tx) => {
    await tx`
      insert into app_users (id, email, full_name)
      values (${input.user.id}, ${email}, ${fullName})
      on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, app_users.full_name)`;

    const already = await tx`
      select 1 from tenant_members
      where tenant_id = ${target.tenantId} and user_id = ${input.user.id} limit 1`;
    if (already.length > 0) {
      return { status: "member", slug: target.slug, name: target.name } as JoinOutcome;
    }

    // The match. An address on a record the church holds, on somebody who is an
    // adult and whose record nobody has claimed.
    const matched = await tx<{ id: string }[]>`
      select p.id
      from people p
      join contact_methods c on c.person_id = p.id and c.tenant_id = p.tenant_id
      left join household_memberships hm on hm.person_id = p.id and hm.tenant_id = p.tenant_id
      where p.tenant_id = ${target.tenantId}
        and p.archived_at is null
        and p.app_user_id is null
        and p.lifecycle_status <> 'deceased'
        and c.kind = 'email'
        and lower(c.value) = ${email}
        and coalesce(hm.role, 'other') <> 'child'
        and (p.date_of_birth is null or p.date_of_birth <= current_date - interval '18 years')
      limit 1`;

    if (matched[0]) {
      await tx`update people set app_user_id = ${input.user.id} where id = ${matched[0].id}`;
      await tx`
        insert into tenant_members (tenant_id, user_id, role)
        values (${target.tenantId}, ${input.user.id}, 'member')
        on conflict (tenant_id, user_id) do nothing`;
      return { status: "joined", slug: target.slug, name: target.name } as JoinOutcome;
    }

    const open = await tx`
      select 1 from join_requests
      where tenant_id = ${target.tenantId} and user_id = ${input.user.id} and decided_at is null
      limit 1`;
    if (open.length > 0) return { status: "waiting", name: target.name } as JoinOutcome;

    // A visitor on the church's records from this moment, because somebody who
    // asked to join is somebody the church has now met.
    const [name] = splitName(fullName, email);
    const [person] = await tx<{ id: string }[]>`
      insert into people (tenant_id, first_name, last_name, lifecycle_status)
      values (${target.tenantId}, ${name.first}, ${name.last}, 'visitor')
      returning id`;
    await tx`
      insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
      values (${target.tenantId}, ${person!.id}, 'email', 'home', ${email}, true)`;
    await tx`
      insert into join_requests (tenant_id, user_id, person_id, email, full_name)
      values (${target.tenantId}, ${input.user.id}, ${person!.id}, ${email}, ${fullName})`;

    return { status: "waiting", name: target.name } as JoinOutcome;
  }) as Promise<JoinOutcome>;
}

/** A name to put on a record, from whatever they typed when they signed up. */
function splitName(fullName: string | null, email: string): [{ first: string; last: string }] {
  const parts = (fullName ?? "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return [{ first: parts[0]!, last: parts.slice(1).join(" ") }];
  if (parts.length === 1) return [{ first: parts[0]!, last: "" }];
  return [{ first: email.split("@")[0] ?? email, last: "" }];
}

export interface WaitingPerson {
  id: string;
  personId: string | null;
  email: string;
  fullName: string | null;
  requestedAt: Date;
}

/** R1.7. Who is waiting at this church's door. */
export async function waitingToJoin(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
): Promise<WaitingPerson[]> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  return db
    .select({
      id: joinRequests.id,
      personId: joinRequests.personId,
      email: joinRequests.email,
      fullName: joinRequests.fullName,
      requestedAt: joinRequests.requestedAt,
    })
    .from(joinRequests)
    .where(and(eq(joinRequests.tenantId, actor.tenantId), isNull(joinRequests.decidedAt)))
    .orderBy(desc(joinRequests.requestedAt));
}

/**
 * R1.7. Saying yes or no.
 *
 * Yes links the account to the visitor record it already made and grants the
 * member role. No leaves the visitor record where it is, because somebody who
 * turned up is still somebody the church has met, and takes away nothing but the
 * account.
 */
export async function decideJoinRequest(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId: string },
  input: { id: string; approve: boolean },
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const [request] = await db
    .select()
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.id, input.id),
        eq(joinRequests.tenantId, actor.tenantId),
        isNull(joinRequests.decidedAt),
      ),
    )
    .limit(1);
  if (!request) throw new InvalidInputError("join.error.missing");

  if (input.approve) {
    if (request.personId) {
      await db
        .update(people)
        .set({ appUserId: request.userId })
        .where(and(eq(people.id, request.personId), isNull(people.appUserId)));
    }
    await db.execute(raw`
      insert into tenant_members (tenant_id, user_id, role)
      values (${actor.tenantId}::uuid, ${request.userId}::uuid, 'member')
      on conflict (tenant_id, user_id) do nothing`);
  }

  await db
    .update(joinRequests)
    .set({
      decidedAt: new Date(),
      decidedByUserId: actor.userId,
      outcome: input.approve ? "approved" : "declined",
    })
    .where(eq(joinRequests.id, input.id));
}

/** Whether this account is waiting on any church, for the screen that says so. */
export async function waitingOn(userId: string): Promise<{ name: string }[]> {
  const sql = owner();
  return sql<{ name: string }[]>`
    select t.name from join_requests r
    join tenants t on t.id = r.tenant_id
    where r.user_id = ${userId} and r.decided_at is null
    order by r.requested_at desc`;
}
