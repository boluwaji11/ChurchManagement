import { and, eq, gt, isNull, sql as raw } from "drizzle-orm";
import { owner } from "../client";
import type { TenantRole } from "../roles";
import { PERMISSIONS, type Permission } from "../permissions";
import { InvalidInputError } from "../errors";
import { DEFAULT_PIPELINES } from "./followups";
import { SEED_TEAMS } from "./serving";
import {
  addressAlreadyClaimed, claimRecord, claimableRecord, nameForRecord, recordForAccount,
  writeAccount, writeRecordFor,
} from "./claim";

export interface Membership {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  /** R22.8. Which spelling this church reads, settled before a word is drawn. */
  tenantCountry: string;
  role: TenantRole;
  /**
   * R1.6. The permissions this member actually holds.
   *
   * Null for somebody on a built-in role, where the matrix in permissions.ts is
   * the answer. A church's own role carries its set here, read on the way into
   * the session so no screen has to ask again.
   */
  permissions: Permission[] | null;
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
 * from inside one church's context. It is one of three operations that run
 * before a tenant context exists, all of them named and documented: this one,
 * resolveTenantBySlug, and createChurch.
 */
export async function membershipsForUser(userId: string): Promise<Membership[]> {
  const rows = await owner()<Row[]>`
    select
      t.id   as "tenantId",
      t.slug as "tenantSlug",
      t.name as "tenantName",
      t.country as "tenantCountry",
      m.role as "role",
      r.permissions as "permissions",
      r.builtin as "builtin",
      r.customised as "customised"
    from tenant_members m
    join tenants t on t.id = m.tenant_id
    left join tenant_roles r
           on r.tenant_id = m.tenant_id
          and (r.id = m.role_id
               or (m.role_id is null and r.builtin and r.key = m.role::text))
    where m.user_id = ${userId}
    order by t.name`;
  return rows.map(held);
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
  const rows = await owner()<Row[]>`
    select
      t.id   as "tenantId",
      t.slug as "tenantSlug",
      t.name as "tenantName",
      t.country as "tenantCountry",
      m.role as "role",
      r.permissions as "permissions",
      r.builtin as "builtin",
      r.customised as "customised"
    from tenant_members m
    join tenants t on t.id = m.tenant_id
    left join tenant_roles r
           on r.tenant_id = m.tenant_id
          and (r.id = m.role_id
               or (m.role_id is null and r.builtin and r.key = m.role::text))
    where m.user_id = ${userId} and m.tenant_id = ${tenantId}
    limit 1`;
  return rows[0] ? held(rows[0]) : null;
}

/** The row as the database hands it back, before the permissions are filtered. */
type Row = Omit<Membership, "permissions"> & {
  permissions: string[] | null;
  builtin: boolean | null;
  customised: boolean | null;
};

/**
 * R1.6. What this member actually holds.
 *
 * A built-in role the church has left alone answers null, meaning the matrix in
 * permissions.ts decides. Its stored row is a copy written when the church was
 * first read and refreshed only on the roles screen, so reading it here would
 * mean a permission added to the product never reaching a church that had not
 * opened that screen. A church that has edited a role owns every answer for it
 * and keeps its own set.
 *
 * Whatever is kept is filtered to the permissions the catalogue still names,
 * because one we removed leaves rows behind in every church that granted it and
 * a stale key must never be read as a grant.
 */
function held(row: Row): Membership {
  const { builtin, customised, ...rest } = row;
  const fromMatrix = builtin === true && customised !== true;

  return {
    ...rest,
    permissions: row.permissions && !fromMatrix
      ? PERMISSIONS.filter((one) => row.permissions!.includes(one))
      : null,
  };
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

  await writeAccount(sql, { id: user.id, email, fullName: user.fullName });

  const pending = await sql<
    { id: string; tenant_id: string; role: TenantRole; member_id: string | null }[]
  >`
    select id, tenant_id, role, member_id from invitations
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

    // R1.7. An invitation that grants a role and links no record leaves
    // somebody signed in to a church that has never heard of them.
    await linkOrCreatePerson({
      tenantId: invite.tenant_id,
      userId: user.id,
      email,
      fullName: user.fullName ?? null,
      memberId: invite.member_id,
    });

    const rows = await sql<Membership[]>`
      select t.id as "tenantId", t.slug as "tenantSlug", t.name as "tenantName", ${invite.role}::text as "role"
      from tenants t where t.id = ${invite.tenant_id}`;
    if (rows[0]) joined.push(rows[0]);
  }

  return { joined };
}

/**
 * R1.7, R2.1. Everybody with an account is somebody the church holds a record
 * for.
 *
 * Three ways round, in order: the record the invitation named, a record already
 * carrying this verified address, or a new one written from what they signed up
 * with. An account with no record is somebody no follow-up can land on, who
 * appears in no list, and whose own profile screen has nothing to show.
 *
 * The email has to be verified before this runs, which the caller checks, or
 * claiming somebody else's record would be a matter of typing their address.
 */
export async function linkOrCreatePerson(input: {
  tenantId: string;
  userId: string;
  email: string;
  fullName: string | null;
  /** The record an invitation named, where it named one. */
  memberId?: string | null;
}): Promise<string | null> {
  const sql = owner();
  const email = input.email.trim().toLowerCase();

  const already = await recordForAccount(sql, input.tenantId, input.userId);
  if (already) return already;

  if (input.memberId) {
    const named = await claimRecord(sql, input.tenantId, input.memberId, input.userId);
    if (named) return named;
  }

  const matched = await claimableRecord(sql, input.tenantId, email);
  if (matched) {
    const claimed = await claimRecord(sql, input.tenantId, matched, input.userId);
    if (claimed) return claimed;
  }

  /*
   * A record carrying this address that somebody else's account already holds.
   * Writing a second one would hand the church two Sarah Bennetts to merge, so
   * this stops instead and leaves the two for a person to look at. An
   * administrator sent this invitation and can sort it out; nobody is locked
   * out of anything while they do. Everything that asks "who is this account"
   * handles null, and a duplicate created quietly would be found weeks later.
   */
  if (await addressAlreadyClaimed(sql, input.tenantId, email)) return null;

  const name = nameForRecord({ fullName: input.fullName }, email);
  return writeRecordFor(sql, {
    tenantId: input.tenantId,
    userId: input.userId,
    email,
    first: name.first,
    last: name.last,
    // Somebody an administrator invited is a member of the church.
    lifecycle: "member",
  });
}

/**
 * R17.1. Keeps the name on the account in step with the name on the record.
 *
 * The sidebar, the audit log and every "who did this" read the account, and the
 * church reads the record. Somebody correcting their own name should not have
 * to do it twice, and should never see two different names for themselves on
 * one screen.
 */
export async function setAccountName(userId: string, fullName: string): Promise<void> {
  const name = fullName.trim();
  if (!name) return;
  await owner()`update app_users set full_name = ${name} where id = ${userId}`;
}

/** R1.7. Invite by email with a role and an expiry. Default 14 days. */
export async function createInvitation(input: {
  tenantId: string;
  email: string;
  role: TenantRole;
  invitedByUserId?: string;
  /** R1.7. The record this is for, so accepting ties the account to it. */
  memberId?: string | null;
  days?: number;
}): Promise<{ id: string }> {
  const sql = owner();

  /*
   * R1.1. A church nobody has looked at yet cannot reach anybody outside
   * itself. The person who made it still has their own account and their own
   * records, which is everything a real church needs in its first hour.
   */
  const [standing] = await sql<{ approved: boolean }[]>`
    select approved_at is not null as approved from tenants where id = ${input.tenantId}`;
  if (!standing?.approved) throw new InvalidInputError("provisional.error.locked");

  const rows = await sql<{ id: string }[]>`
    insert into invitations (tenant_id, email, role, invited_by_user_id, member_id, expires_at)
    values (
      ${input.tenantId}, ${input.email.trim().toLowerCase()}, ${input.role}::tenant_role,
      ${input.invitedByUserId ?? null}, ${input.memberId ?? null},
      now() + make_interval(days => ${input.days ?? 14})
    )
    on conflict (tenant_id, email) do update set
      role = excluded.role,
      member_id = coalesce(excluded.member_id, invitations.member_id),
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

// ---------------------------------------------------------------------------
// Creating a church (HRT-32, R1.1, R22.1)
// ---------------------------------------------------------------------------

/**
 * Slugs that cannot be a church, because they are routes or would read as one.
 *
 * A church whose slug is "sign-in" is not a security hole, since the slug is a
 * query parameter rather than a path today. It is reserved anyway, because the
 * day the URL becomes connectapp.church/sign-in it would be, and renaming a church
 * that has been in use for a year is not a fix anybody enjoys.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "about", "account", "admin", "api", "app", "assets", "auth", "billing", "blog",
  "choose-church", "contact", "create-church", "dashboard", "design", "docs", "download",
  "fields",
  "give", "giving", "help", "home", "connectapp", "icon", "images", "index", "invite",
  "legal", "login", "logout", "new", "members", "portal", "pricing", "privacy",
  "public", "register", "reset", "root", "security", "settings", "setup", "sign-in",
  "sign-out", "sign-up", "start", "static", "status", "stage", "support", "system", "tags",
  "terms", "test", "user", "users", "www",
];

/** "St. Mark's Riverside" becomes "st-marks-riverside". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/**
 * Creates a church and makes the signed-in person its Owner.
 *
 * This runs on the owner connection, which is the third and last documented
 * pre-authorization write. It has to: there is no tenant context to set, because
 * the tenant does not exist until the first statement of this transaction. The
 * exception is narrow and the shape of it is the safety. Nothing here reads
 * anything the caller could point at. It inserts a tenant, a campus, the caller's
 * own app_users row, and one membership naming the caller. There is no input that
 * makes it touch a church that already exists.
 *
 * The whole thing is one transaction, so a failure halfway cannot leave a church
 * nobody can open.
 */
export async function createChurch(input: {
  name: string;
  timezone: string;
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    /** R2.1. The two halves of the founder's own record in the church. */
    firstName?: string | null;
    lastName?: string | null;
    emailVerified: boolean;
  };
}): Promise<{ tenantId: string; slug: string; name: string }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new InvalidInputError("error.churchNameShort");
  if (name.length > 120) throw new InvalidInputError("error.churchNameLong");

  // An unverified address must never become an Owner. Everything else in the
  // product trusts that a membership was granted to somebody who proved the
  // address, and this is the one path that grants one without an invitation.
  if (!input.user.emailVerified) {
    throw new InvalidInputError("error.emailUnverified");
  }

  const timezone = isKnownTimezone(input.timezone) ? input.timezone : "America/Chicago";

  const base = slugify(name) || "church";
  const sql = owner();

  return sql.begin(async (tx) => {
    // Taken slugs and reserved words are resolved in one place, inside the
    // transaction, so two members naming their church the same thing in the same
    // second cannot both win. The unique index is the real arbiter.
    let slug = RESERVED_SLUGS.includes(base) ? `${base}-church` : base;
    for (let n = 2; ; n++) {
      const clash = await tx`select 1 from tenants where slug = ${slug} limit 1`;
      if (clash.length === 0) break;
      slug = `${base}-${n}`;
      if (n > 200) throw new InvalidInputError("error.churchNameCollides");
    }

    const [tenant] = await tx<{ id: string }[]>`
      insert into tenants (slug, name, timezone)
      values (${slug}, ${name}, ${timezone})
      returning id`;
    if (!tenant) throw new Error("Tenant insert returned no row.");

    // R1.2. A primary campus from the first moment, even though the UI is
    // single-campus. Every later feature can assume one exists.
    const [campus] = await tx<{ id: string }[]>`
      insert into campuses (tenant_id, name, is_primary)
      values (${tenant.id}, ${name}, true)
      returning id`;

    await writeAccount(tx, input.user);

    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant.id}, ${input.user.id}, 'owner')`;

    /*
     * R2.1, R1.7. The founder is a member of their own church.
     *
     * Without this they hold an account and a role and nothing else: absent
     * from their own directory, impossible to put on a team or in a group, and
     * met by "no record" on their own profile screen. The church is empty at
     * this point, so the slug cannot clash and no quota applies.
     *
     * Sign-up asks for the two names separately, so nothing here has to work
     * out where a name splits. An account made before that change falls back to
     * splitting the one line it has.
     */
    const whole = (input.user.fullName ?? "").trim().replace(/\s+/g, " ");
    const cut = whole.lastIndexOf(" ");
    const first = (input.user.firstName ?? "").trim() || (cut > 0 ? whole.slice(0, cut) : whole);
    const last = (input.user.lastName ?? "").trim() || (cut > 0 ? whole.slice(cut + 1) : "");
    const personSlug =
      slugify([first, last].filter(Boolean).join(" "))
      || slugify(input.user.email.split("@")[0] ?? "")
      || "owner";

    const [person] = await tx<{ id: string }[]>`
      insert into members (
        tenant_id, campus_id, app_user_id, slug,
        first_name, last_name, lifecycle_status, membership_date
      )
      values (
        ${tenant.id}, ${campus?.id ?? null}, ${input.user.id}, ${personSlug},
        ${first || "Owner"}, ${last}, 'member', current_date
      )
      returning id`;

    if (person) {
      await tx`
        insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
        values (${tenant.id}, ${person.id}, 'email', 'home',
                ${input.user.email.trim().toLowerCase()}, true)`;
    }

    // R5.2. The six follow-up pipelines, with their steps. Same reason: a
    // church should be able to welcome its first visitor at its first service
    // rather than design a process first.
    for (const [position, pipeline] of DEFAULT_PIPELINES.entries()) {
      const [row] = await tx<{ id: string }[]>`
        insert into pipelines (tenant_id, key, name, description, hue, position)
        values (${tenant.id}, ${pipeline.key}, ${pipeline.name}, ${pipeline.description},
                ${pipeline.hue}, ${position})
        returning id`;
      for (const [at, step] of pipeline.steps.entries()) {
        await tx`
          insert into pipeline_steps (tenant_id, pipeline_id, name, due_days, position)
          values (${tenant.id}, ${row!.id}, ${step.name}, ${step.dueDays}, ${at})`;
      }
    }

    // R10.1. The five teams the target church already runs, with the
    // positions each one schedules. Same reason again: a worship leader
    // opening Serving should see their band, not a form asking what a
    // position is.
    for (const [position, team] of SEED_TEAMS.entries()) {
      const [row] = await tx<{ id: string }[]>`
        insert into teams (tenant_id, slug, name, hue, position)
        values (${tenant.id}, hearth_slug(${team.name}), ${team.name}, ${team.hue}, ${position})
        returning id`;
      for (const [at, slot] of team.positions.entries()) {
        await tx`
          insert into team_positions
            (tenant_id, team_id, name, needed, with_children, requires_check, position)
          values (${tenant.id}, ${row!.id}, ${slot.name}, ${slot.needed ?? 1},
                  ${slot.withChildren ?? false}, ${slot.withChildren ?? false}, ${at})`;
      }
    }

    return { tenantId: tenant.id, slug, name };
  }) as Promise<{ tenantId: string; slug: string; name: string }>;
}

/**
 * Timezone matters more here than it looks. A service day is a local concept, the
 * no-deploy window is local, and a giving statement's year end is local.
 */
export function isKnownTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The team, and who is waiting to join it (HRT-108, R1.7, R22.1)
// ---------------------------------------------------------------------------

export interface TeamMember {
  userId: string;
  email: string;
  name: string | null;
  role: TenantRole;
  /** R1.6. The church's own role they hold, where they hold one. */
  roleId: string | null;
  roleName: string | null;
  isSelf: boolean;
  /** R1.4. When they last signed in, null for somebody who never has. */
  lastSignedInAt: Date | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: TenantRole;
  expiresAt: Date;
}

/**
 * R1.4. Who has an account in this church.
 *
 * Read on the owner connection, like everything else about membership, because
 * tenant_members is what decides a tenant context in the first place and cannot
 * be read through one.
 */
export async function listTeam(
  tenantId: string,
  selfUserId?: string | null,
): Promise<TeamMember[]> {
  /*
   * R1.4. Last signed in comes from the auth schema, which is the only place
   * that knows. Read on the owner connection, the same one tenant_members
   * needs, and left-joined so a database without the auth schema answers with
   * the team and a blank column rather than with an error.
   */
  const rows = await owner()<
    {
      user_id: string; email: string; full_name: string | null; role: string;
      role_id: string | null; role_name: string | null;
      last_sign_in_at: Date | null;
    }[]
  >`
    select m.user_id, u.email, u.full_name, m.role::text as role,
           m.role_id, r.name as role_name,
           au.last_sign_in_at
      from tenant_members m
      join app_users u on u.id = m.user_id
      left join tenant_roles r
           on r.tenant_id = m.tenant_id
          and (r.id = m.role_id
               or (m.role_id is null and r.builtin and r.key = m.role::text))
      left join auth.users au on au.id = m.user_id
     where m.tenant_id = ${tenantId}
     order by u.email`;

  return rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    name: row.full_name,
    role: row.role as TenantRole,
    roleId: row.role_id,
    // Only a church's own role has a name worth showing. A built-in is named
    // by the product unless this church renamed it, which listRoles reports.
    roleName: row.role_id ? row.role_name : null,
    isSelf: row.user_id === selfUserId,
    lastSignedInAt: row.last_sign_in_at ?? null,
  }));
}

/** R1.7. Invitations nobody has accepted, and nobody has revoked. */
export async function listInvitations(tenantId: string): Promise<PendingInvitation[]> {
  const rows = await owner()<
    { id: string; email: string; role: string; expires_at: Date }[]
  >`
    select id, email, role::text as role, expires_at
      from invitations
     where tenant_id = ${tenantId}
       and accepted_at is null
       and revoked_at is null
       and expires_at > now()
     order by email`;

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as TenantRole,
    expiresAt: row.expires_at,
  }));
}

/**
 * R1.4. Changing somebody's role.
 *
 * A church cannot remove its last owner, by this or by any other path. A church
 * with no owner is a church nobody can administer, and the members it belongs to
 * cannot fix it themselves.
 */
export async function setMemberRole(
  tenantId: string,
  userId: string,
  role: TenantRole,
  /**
   * R1.6. The church's own role this member holds, where they hold one. The
   * enum column then carries "member", so any path reading it alone, including
   * the audit log, fails closed rather than inheriting the role they came from.
   */
  roleId: string | null = null,
): Promise<void> {
  const sql = owner();
  const builtIn: TenantRole = roleId ? "member" : role;

  if (builtIn !== "owner") {
    const [count] = await sql<{ n: string }[]>`
      select count(*)::text as n from tenant_members
       where tenant_id = ${tenantId} and role = 'owner' and user_id <> ${userId}`;
    if (Number(count?.n ?? 0) === 0) throw new InvalidInputError("team.error.lastOwner");
  }

  await sql`
    update tenant_members
       set role = ${builtIn}::tenant_role,
           role_id = ${roleId}
     where tenant_id = ${tenantId} and user_id = ${userId}`;
}

/** R1.4. Taking somebody's access away. Their person record is untouched. */
export async function removeMember(tenantId: string, userId: string): Promise<void> {
  const sql = owner();
  const [count] = await sql<{ n: string }[]>`
    select count(*)::text as n from tenant_members
     where tenant_id = ${tenantId} and role = 'owner' and user_id <> ${userId}`;
  if (Number(count?.n ?? 0) === 0) throw new InvalidInputError("team.error.lastOwner");
  await sql`delete from tenant_members where tenant_id = ${tenantId} and user_id = ${userId}`;
}
