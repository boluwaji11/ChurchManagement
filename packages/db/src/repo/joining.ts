/**
 * R1.7, R22.1. How somebody who is not staff gets an account.
 *
 * The order is church, then members, then accounts. A church exists first.
 * People are records the church made, by import, by a form, at a check-in desk
 * or by hand. An account claims one of those records, and the proof is an
 * address the church already wrote down.
 *
 * The church is named by the address they arrived at, so there is nothing to
 * type and nothing to leak. A church that has its door open lets somebody in
 * and nobody is asked to approve anything; the control is the switch and the
 * cap on a provisional church, which is the argument that was settled once
 * already in provisional.ts. The only question left is which record they get:
 * the one the church already has under that address, or a new one written the
 * moment they arrive.
 *
 * Everything here before the membership exists runs on the owner connection, as
 * the rest of membership.ts does. There is no tenant context to set for somebody
 * who is not yet in the tenant.
 */
import { owner } from "../client";
import { InvalidInputError } from "../errors";
import { PermissionError, type TenantRole } from "../roles";
import { canManageChurch } from "./church";

export interface JoinTarget {
  tenantId: string;
  slug: string;
  name: string;
}

/**
 * The church behind a public address, where that church is open to it.
 *
 * Runs before anybody is anybody. A church nobody has looked at yet has no
 * public door, and a demo church is nobody's.
 */
export async function churchForSelfSignup(slug: string): Promise<JoinTarget | null> {
  const value = slug.trim().toLowerCase();
  if (!value) return null;

  const sql = owner();
  const rows = await sql<JoinTarget[]>`
    select id as "tenantId", slug, name from tenants
    where slug = ${value}
      and self_signup
      and demo_expires_at is null
      and approved_at is not null
    limit 1`;
  return rows[0] ?? null;
}

/** R1.7. Opening or shutting the church's own door. */
export async function setSelfSignup(
  tenantId: string,
  role: TenantRole,
  open: boolean,
): Promise<void> {
  if (!canManageChurch(role)) throw new PermissionError(role, "editChurch");

  const sql = owner();

  /*
   * R1.1. A church nobody has looked at yet does not get a door to the public.
   * Opening one is the thing a church cannot undo, and it is the thing worth
   * having for somebody who is not a church.
   */
  if (open) {
    const [standing] = await sql<{ approved: boolean }[]>`
      select approved_at is not null as approved from tenants where id = ${tenantId}`;
    if (!standing?.approved) throw new InvalidInputError("provisional.error.locked");
  }

  await sql`update tenants set self_signup = ${open} where id = ${tenantId}`;
}

export type JoinOutcome =
  /** In, holding a record: the one that was already there, or one written now. */
  | { status: "joined"; slug: string; name: string }
  /** They were already in. */
  | { status: "member"; slug: string; name: string };

/**
 * R1.7. Going through the door.
 *
 * One transaction, because a half-finished join is somebody holding a record
 * they cannot reach or a membership pointing at nothing.
 *
 * A child's record is never claimable, whoever the address belongs to. A record
 * somebody else has already claimed is not claimable either: that is a shared
 * mailbox or a mistake. Both cases get their own new record instead, which the
 * church merges (R2.8) if it turns out to be the same person.
 */
export async function joinChurch(input: {
  slug: string;
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    emailVerified: boolean;
  };
}): Promise<JoinOutcome> {
  if (!input.user.emailVerified) throw new InvalidInputError("error.emailUnverified");

  const target = await churchForSelfSignup(input.slug);
  if (!target) throw new InvalidInputError("join.error.shut");

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
      from members p
      join contact_methods c on c.member_id = p.id and c.tenant_id = p.tenant_id
      left join household_memberships hm on hm.member_id = p.id and hm.tenant_id = p.tenant_id
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
      await tx`update members set app_user_id = ${input.user.id} where id = ${matched[0].id}`;
      await tx`
        insert into tenant_members (tenant_id, user_id, role)
        values (${target.tenantId}, ${input.user.id}, 'member')
        on conflict (tenant_id, user_id) do nothing`;
      return { status: "joined", slug: target.slug, name: target.name } as JoinOutcome;
    }

    // Nothing under that address, so the church has a new visitor, written from
    // what they typed when they made the account.
    const name = nameFor(input.user, email);
    const [person] = await tx<{ id: string }[]>`
      insert into members (tenant_id, slug, first_name, last_name, lifecycle_status, app_user_id)
      values (${target.tenantId},
              hearth_free_member_slug(${target.tenantId}::uuid, ${`${name.first} ${name.last}`.trim()}),
              ${name.first}, ${name.last}, 'visitor', ${input.user.id})
      returning id`;
    await tx`
      insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
      values (${target.tenantId}, ${person!.id}, 'email', 'home', ${email}, true)`;
    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${target.tenantId}, ${input.user.id}, 'member')
      on conflict (tenant_id, user_id) do nothing`;

    return { status: "joined", slug: target.slug, name: target.name } as JoinOutcome;
  }) as Promise<JoinOutcome>;
}

/**
 * A name to put on a record. Sign-up asks for the two separately, so the split
 * is only there for an account made before it did.
 */
function nameFor(
  user: { fullName?: string | null; firstName?: string | null; lastName?: string | null },
  email: string,
): { first: string; last: string } {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first) return { first, last: last ?? "" };

  const parts = (user.fullName ?? "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { first: parts[0]!, last: parts.slice(1).join(" ") };
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: email.split("@")[0] ?? email, last: "" };
}
