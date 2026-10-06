import { owner } from "../client";

/**
 * The portal is a tool for the people running ConnectApp rather than a screen a
 * church sees, so its messages are written here in English. Every other
 * user-facing string in the product goes through the catalogue.
 */
export class PlatformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformError";
  }
}

/**
 * R21.x. The platform's own operators.
 *
 * Everything here reads across every church, which no tenant role may do, so it
 * runs on the owner connection behind a check that the asking account is a live
 * platform admin. That check is the first statement of every function in this
 * file, and nothing here takes a tenant context: there is no church whose
 * session could reach it.
 *
 * Every write lands in platform_events, which is append only, so the record of
 * who approved a church outlives whoever approved it.
 */

export interface PlatformAdmin {
  userId: string;
  name: string;
  email: string;
  grantedAt: Date;
  grantedByName: string | null;
  revokedAt: Date | null;
}

export interface ChurchRow {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  createdAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
  archivedAt: Date | null;
  archivedReason: string | null;
  /** Live member records the church holds. */
  members: number;
  /** Accounts that can sign in to it. */
  accounts: number;
  ownerName: string | null;
  ownerEmail: string | null;
  /** The last thing anybody did in it, from the church's own audit log. */
  lastActivity: Date | null;
}

export interface PlatformEvent {
  id: string;
  at: Date;
  actorName: string;
  action: string;
  tenantId: string | null;
  tenantName: string | null;
  note: string | null;
}

export interface Signals {
  churches: number;
  provisional: number;
  archived: number;
  newThisMonth: number;
  members: number;
  accounts: number;
  /** R22.x. Churches that have recorded attendance or a check-in in 12 weeks. */
  active: number;
}

/** R21.x. Whether this account may operate the platform at all. */
export async function platformAdmin(userId: string): Promise<{ id: string; name: string } | null> {
  if (!userId) return null;
  const rows = await owner()<{ id: string; name: string }[]>`
    select a.user_id as id, a.name
      from platform_admins a
     where a.user_id = ${userId} and a.revoked_at is null
     limit 1`;
  return rows[0] ?? null;
}

async function requireAdmin(userId: string): Promise<{ id: string; name: string }> {
  const who = await platformAdmin(userId);
  if (!who) throw new PlatformError("This account does not operate the platform.");
  return who;
}

/** R21.x. Writing down what an operator did, in the log nobody can edit. */
async function record(
  actor: { id: string; name: string },
  action: string,
  about: { tenantId?: string; tenantName?: string; note?: string } = {},
): Promise<void> {
  await owner()`
    insert into platform_events (actor_id, actor_name, action, tenant_id, tenant_name, note)
    values (
      ${actor.id}, ${actor.name}, ${action},
      ${about.tenantId ?? null}, ${about.tenantName ?? null},
      ${about.note?.trim() || null}
    )`;
}

/** R21.x. Every church on the platform, newest first. */
export async function listChurches(
  by: string,
  opts: { query?: string; standing?: "all" | "provisional" | "approved" | "archived" } = {},
): Promise<ChurchRow[]> {
  await requireAdmin(by);
  const like = `%${(opts.query ?? "").trim().toLowerCase()}%`;
  const standing = opts.standing ?? "all";

  return owner()<ChurchRow[]>`
    select
      t.id,
      t.slug,
      t.name,
      t.timezone,
      t.created_at as "createdAt",
      t.approved_at as "approvedAt",
      t.approved_by as "approvedBy",
      t.archived_at as "archivedAt",
      t.archived_reason as "archivedReason",
      (select count(*)::int from members m
        where m.tenant_id = t.id and m.archived_at is null) as members,
      (select count(*)::int from tenant_members tm where tm.tenant_id = t.id) as accounts,
      (select coalesce(nullif(trim(concat_ws(' ', m.first_name, m.last_name)), ''), u.email)
         from tenant_members tm
         join app_users u on u.id = tm.user_id
         left join members m on m.app_user_id = u.id and m.tenant_id = t.id
        where tm.tenant_id = t.id and tm.role = 'owner'
        order by tm.created_at asc limit 1) as "ownerName",
      (select u.email
         from tenant_members tm
         join app_users u on u.id = tm.user_id
        where tm.tenant_id = t.id and tm.role = 'owner'
        order by tm.created_at asc limit 1) as "ownerEmail",
      (select max(a.at) from audit_entries a where a.tenant_id = t.id) as "lastActivity"
    from tenants t
    where (${like} = '%%' or lower(t.name) like ${like} or lower(t.slug) like ${like})
      and case ${standing}
            when 'provisional' then t.approved_at is null and t.archived_at is null
            when 'approved' then t.approved_at is not null and t.archived_at is null
            when 'archived' then t.archived_at is not null
            else true
          end
    order by t.created_at desc`;
}

/** R21.x. One church, as the operator's page reads it. */
export async function church(by: string, id: string): Promise<ChurchRow | null> {
  const all = await listChurches(by);
  return all.find((one) => one.id === id || one.slug === id) ?? null;
}

async function named(id: string): Promise<{ id: string; name: string }> {
  const rows = await owner()<{ id: string; name: string }[]>`
    select id, name from tenants where id = ${id} limit 1`;
  const found = rows[0];
  if (!found) throw new PlatformError("That church could not be found.");
  return found;
}

/** R1.1. A human has looked at this church and says it is a church. */
export async function approve(by: string, tenantId: string, note: string): Promise<void> {
  const actor = await requireAdmin(by);
  const target = await named(tenantId);
  await owner()`
    update tenants
       set approved_at = now(), approved_by = ${actor.name}, updated_at = now()
     where id = ${tenantId}`;
  await record(actor, "approved", { tenantId, tenantName: target.name, note });
}

/** R1.1. Putting a church back behind the cap, when it should not have passed. */
export async function unapprove(by: string, tenantId: string, note: string): Promise<void> {
  const actor = await requireAdmin(by);
  const target = await named(tenantId);
  await owner()`
    update tenants
       set approved_at = null, approved_by = null, updated_at = now()
     where id = ${tenantId}`;
  await record(actor, "unapproved", { tenantId, tenantName: target.name, note });
}

/**
 * R21.x. Taking a church out of service.
 *
 * Archive, never delete: every record it holds stays, and the church stops
 * counting towards anything. Nobody can sign in to it, which is what makes this
 * the answer for a test church, a duplicate, or a church that has wound down.
 */
export async function archive(by: string, tenantId: string, reason: string): Promise<void> {
  const actor = await requireAdmin(by);
  const target = await named(tenantId);
  const why = reason.trim();
  if (!why) throw new PlatformError("Say why this church is being taken out of service.");

  await owner()`
    update tenants
       set archived_at = now(), archived_reason = ${why}, updated_at = now()
     where id = ${tenantId}`;
  await record(actor, "archived", { tenantId, tenantName: target.name, note: why });
}

/** R21.x. Putting an archived church back into service. */
export async function restore(by: string, tenantId: string, note: string): Promise<void> {
  const actor = await requireAdmin(by);
  const target = await named(tenantId);
  await owner()`
    update tenants
       set archived_at = null, archived_reason = null, updated_at = now()
     where id = ${tenantId}`;
  await record(actor, "restored", { tenantId, tenantName: target.name, note });
}

/** R21.x. What the operators have done, newest first. */
export async function events(
  by: string,
  opts: { tenantId?: string; limit?: number } = {},
): Promise<PlatformEvent[]> {
  await requireAdmin(by);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const tenantId = opts.tenantId ?? null;

  return owner()<PlatformEvent[]>`
    select id, at, actor_name as "actorName", action,
           tenant_id as "tenantId", tenant_name as "tenantName", note
      from platform_events
     where (${tenantId}::uuid is null or tenant_id = ${tenantId}::uuid)
     order by at desc
     limit ${limit}`;
}

/** R21.x. Who may operate the platform. */
export async function admins(by: string): Promise<PlatformAdmin[]> {
  await requireAdmin(by);
  return owner()<PlatformAdmin[]>`
    select a.user_id as "userId", a.name, u.email,
           a.granted_at as "grantedAt", a.revoked_at as "revokedAt",
           (select g.name from platform_admins g where g.user_id = a.granted_by) as "grantedByName"
      from platform_admins a
      join app_users u on u.id = a.user_id
     order by a.revoked_at nulls first, a.granted_at asc`;
}

/** R21.x. Giving somebody else the same power, by the address they sign in with. */
export async function grant(by: string, email: string, name: string): Promise<void> {
  const actor = await requireAdmin(by);
  const address = email.trim().toLowerCase();
  const who = name.trim();
  if (!address || !who) throw new PlatformError("An address and a name are both needed.");

  const rows = await owner()<{ id: string }[]>`
    select id from app_users where email = ${address} limit 1`;
  const found = rows[0];
  if (!found) throw new PlatformError("No account signs in with that address yet.");

  await owner()`
    insert into platform_admins (user_id, name, granted_by)
    values (${found.id}, ${who}, ${actor.id})
    on conflict (user_id) do update
      set name = excluded.name, granted_by = excluded.granted_by,
          granted_at = now(), revoked_at = null`;
  await record(actor, "granted", { note: `${who} (${address})` });
}

/** R21.x. Taking it away. The row stays, so the log still reads. */
export async function revoke(by: string, userId: string): Promise<void> {
  const actor = await requireAdmin(by);
  if (actor.id === userId) throw new PlatformError("Taking your own access away would leave you locked out.");

  const rows = await owner()<{ name: string }[]>`
    update platform_admins set revoked_at = now()
     where user_id = ${userId} and revoked_at is null
     returning name`;
  const gone = rows[0];
  if (!gone) throw new PlatformError("That account does not operate the platform.");
  await record(actor, "revoked", { note: gone.name });
}

/** R22.x. The numbers the platform is run on. */
export async function signals(by: string): Promise<Signals> {
  await requireAdmin(by);
  const rows = await owner()<Signals[]>`
    select
      (select count(*)::int from tenants where archived_at is null) as churches,
      (select count(*)::int from tenants
        where archived_at is null and approved_at is null) as provisional,
      (select count(*)::int from tenants where archived_at is not null) as archived,
      (select count(*)::int from tenants
        where created_at > now() - interval '30 days') as "newThisMonth",
      (select count(*)::int from members where archived_at is null) as members,
      (select count(*)::int from app_users) as accounts,
      (select count(distinct a.tenant_id)::int from audit_entries a
        where a.at > now() - interval '84 days') as active`;
  return rows[0]!;
}

export interface AccountHit {
  userId: string;
  email: string;
  churches: { name: string; slug: string; role: string }[];
}

/**
 * R21.x. Finding an account, for the support question that starts "I cannot
 * sign in". Which churches it belongs to and with what role, and nothing else:
 * a church's records are the church's.
 */
export async function findAccount(by: string, query: string): Promise<AccountHit[]> {
  await requireAdmin(by);
  const like = `%${query.trim().toLowerCase()}%`;
  if (like === "%%") return [];

  const rows = await owner()<
    { userId: string; email: string; name: string; slug: string; role: string }[]
  >`
    select u.id as "userId", u.email, t.name, t.slug, tm.role
      from app_users u
      left join tenant_members tm on tm.user_id = u.id
      left join tenants t on t.id = tm.tenant_id
     where lower(u.email) like ${like}
     order by u.email asc, t.name asc
     limit 100`;

  const out = new Map<string, AccountHit>();
  for (const row of rows) {
    const hit = out.get(row.userId) ?? { userId: row.userId, email: row.email, churches: [] };
    if (row.slug) hit.churches.push({ name: row.name, slug: row.slug, role: row.role });
    out.set(row.userId, hit);
  }
  return [...out.values()];
}
