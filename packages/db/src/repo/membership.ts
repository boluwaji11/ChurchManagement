import { and, eq, gt, isNull, sql as raw } from "drizzle-orm";
import { owner } from "../client";
import type { TenantRole } from "../roles";

export interface Membership {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: TenantRole;
}

/**
 * The authorization boundary.
 *
 * Row-level security stops a request reading another church's data once a tenant
 * context is set. It says nothing about which context a given user is allowed to
 * set. That decision is made here, and only here, from the database rather than
 * from anything the client sent.
 *
 * This runs on the owner connection because it is inherently cross-tenant: the
 * question is "which churches does this user belong to", which cannot be answered
 * from inside one church's context. It is the second and last legitimate
 * pre-authorization lookup, alongside resolveTenantBySlug.
 */
export async function membershipsForUser(userId: string): Promise<Membership[]> {
  return owner()<Membership[]>`
    select
      t.id   as "tenantId",
      t.slug as "tenantSlug",
      t.name as "tenantName",
      m.role as "role"
    from tenant_members m
    join tenants t on t.id = m.tenant_id
    where m.user_id = ${userId}
    order by t.name`;
}

/**
 * Verifies a specific membership. The caller passes a tenant the user asked for,
 * and gets back a role only if the database agrees they belong there.
 *
 * Returning null rather than throwing is deliberate: the caller renders the same
 * "not found" as it would for a church that does not exist, so a URL cannot be
 * used to discover which churches are on the platform.
 */
export async function verifyMembership(userId: string, tenantId: string): Promise<Membership | null> {
  const rows = await owner()<Membership[]>`
    select
      t.id   as "tenantId",
      t.slug as "tenantSlug",
      t.name as "tenantName",
      m.role as "role"
    from tenant_members m
    join tenants t on t.id = m.tenant_id
    where m.user_id = ${userId} and m.tenant_id = ${tenantId}
    limit 1`;
  return rows[0] ?? null;
}

/**
 * Mirrors the verified Supabase Auth user into app_users, and accepts any
 * pending invitation matching their verified email.
 *
 * The email must already be verified by Supabase. If an unverified address were
 * accepted here, an invitation would become a way to join any church by claiming
 * someone else's address.
 */
export async function syncUserAndAcceptInvitations(user: {
  id: string;
  email: string;
  fullName?: string | null;
  emailVerified: boolean;
}): Promise<{ joined: Membership[] }> {
  if (!user.emailVerified) return { joined: [] };

  const sql = owner();
  const email = user.email.trim().toLowerCase();

  await sql`
    insert into app_users (id, email, full_name)
    values (${user.id}, ${email}, ${user.fullName ?? null})
    on conflict (id) do update set email = excluded.email, full_name = coalesce(excluded.full_name, app_users.full_name)`;

  const pending = await sql<{ id: string; tenant_id: string; role: TenantRole }[]>`
    select id, tenant_id, role from invitations
    where lower(email) = ${email}
      and accepted_at is null
      and revoked_at is null
      and expires_at > now()`;

  const joined: Membership[] = [];
  for (const invite of pending) {
    await sql`
      insert into tenant_members (tenant_id, user_id, role)
      values (${invite.tenant_id}, ${user.id}, ${invite.role}::tenant_role)
      on conflict (tenant_id, user_id) do update set role = excluded.role`;
    await sql`
      update invitations
      set accepted_at = now(), accepted_by_user_id = ${user.id}
      where id = ${invite.id}`;

    const rows = await sql<Membership[]>`
      select t.id as "tenantId", t.slug as "tenantSlug", t.name as "tenantName", ${invite.role}::text as "role"
      from tenants t where t.id = ${invite.tenant_id}`;
    if (rows[0]) joined.push(rows[0]);
  }

  return { joined };
}

/** R1.7. Invite by email with a role and an expiry. Default 14 days. */
export async function createInvitation(input: {
  tenantId: string;
  email: string;
  role: TenantRole;
  invitedByUserId?: string;
  days?: number;
}): Promise<{ id: string }> {
  const sql = owner();
  const rows = await sql<{ id: string }[]>`
    insert into invitations (tenant_id, email, role, invited_by_user_id, expires_at)
    values (
      ${input.tenantId}, ${input.email.trim().toLowerCase()}, ${input.role}::tenant_role,
      ${input.invitedByUserId ?? null},
      now() + make_interval(days => ${input.days ?? 14})
    )
    on conflict (tenant_id, email) do update set
      role = excluded.role,
      expires_at = excluded.expires_at,
      revoked_at = null,
      accepted_at = null
    returning id`;
  if (!rows[0]) throw new Error("Invitation insert returned no row.");
  return rows[0];
}

export async function revokeInvitation(id: string): Promise<void> {
  await owner()`update invitations set revoked_at = now() where id = ${id} and accepted_at is null`;
}

export { raw, and, eq, gt, isNull };
