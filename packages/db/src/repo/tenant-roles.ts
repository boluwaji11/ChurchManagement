import { and, asc, eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { tenantRoles, tenantMembers } from "../schema/tenancy";
import { PermissionError } from "../roles";
import { InvalidInputError, NameTakenError } from "../errors";
import {
  PERMISSIONS, ROLE_PERMISSIONS, TENANT_ROLES,
  type Permission, type TenantRole,
} from "../permissions";
import { can, type Who } from "../permissions";
import type { WriteActor } from "./members";

/**
 * R1.6. The roles a church has, and the permissions each one holds.
 *
 * The nine built-ins are written into every church so there is one list to read
 * rather than two, and a church's own roles sit beside them. A built-in's
 * permissions are the product's answer and stay fixed: a church that removes
 * "run check-in" from Check-in volunteer has broken a service rather than
 * configured one. Its own roles are entirely its own.
 */

export interface ChurchRole {
  id: string;
  /** The built-in's name, such as "staff", or a slug for a custom role. */
  key: string;
  name: string;
  permissions: Permission[];
  builtin: boolean;
  position: number;
  archived: boolean;
  /** How many members currently hold it. */
  members: number;
}

/** Only somebody who can change the church can change who may do what in it. */
function guard(actor: WriteActor, action: "editRoles"): void {
  if (!can(actor, "church.manage")) throw new PermissionError(actor.role, action);
}

const clean = (raw: string): string => raw.trim().replace(/\s+/g, " ");

/** A custom role's key, derived from its name and kept clear of the built-ins. */
function slug(name: string): string {
  const base = clean(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return base ? `custom_${base}` : "";
}

/** Drops anything the catalogue does not name, so a stale key cannot grant. */
function known(raw: readonly string[]): Permission[] {
  return PERMISSIONS.filter((permission) => raw.includes(permission));
}

/**
 * R1.5, R1.6, R21.2. Whether a set is one this person could hand out.
 *
 * Every permission in it has to be one they hold themselves. An Admin holds
 * `church.manage` and not `giving.amounts`, so without this they could tick
 * the money onto their own role and read the giving a moment later, which
 * makes the field-level restriction on amounts a suggestion. The Owner holds
 * the whole catalogue, so the Owner is never stopped by it.
 */
export function withinReach(actor: Who, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => can(actor, permission));
}

/**
 * The same rule applied to a change rather than to a set.
 *
 * Taking a permission away is held to it too. A permission that is not yours
 * to grant is not yours to withdraw from the treasurer either, and an Admin
 * who could strip `giving.amounts` off Finance has locked the church out of
 * its own money by another route.
 */
function onlyWhatTheyHold(
  actor: WriteActor,
  before: readonly Permission[],
  after: readonly Permission[],
): void {
  const changed = PERMISSIONS.filter(
    (permission) => before.includes(permission) !== after.includes(permission),
  );
  if (!withinReach(actor, changed)) throw new InvalidInputError("roles.error.beyond");
}

/**
 * Writes the nine built-ins for a church that has none.
 *
 * Called on the way into every read, so a church created before R1.6 and a
 * church created this morning both have a complete list without a backfill
 * migration that has to be remembered.
 *
 * They are the set every church starts with. A church that has since changed
 * one keeps its change, so nothing written here is applied twice.
 */
export async function ensureBuiltIns(db: Tx, tenantId: string): Promise<void> {
  /*
   * R1.6. A church starts with Owner and adds the rest when it needs them.
   *
   * The other eight go in already on the shelf, where the roles screen offers
   * them as ready-made answers. Nine roles against twenty permissions is a grid
   * nobody reads, and eight of the nine are empty in a church of forty people.
   */
  const rows = TENANT_ROLES.map((key, position) => ({
    tenantId,
    key,
    name: key,
    permissions: [...ROLE_PERMISSIONS[key]],
    builtin: true,
    position,
    archivedAt: key === "owner" ? null : new Date(),
  }));

  await db
    .insert(tenantRoles)
    .values(rows)
    .onConflictDoUpdate({
      target: [tenantRoles.tenantId, tenantRoles.key],
      set: { permissions: sql`excluded.permissions` },
      // Only where this church has left the built-in alone. A permission added
      // to the product has to reach churches that already exist, and a church
      // that has edited the role owns it from then on.
      where: and(eq(tenantRoles.builtin, true), eq(tenantRoles.customised, false)),
    });
}

export async function listRoles(
  db: Tx,
  tenantId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<ChurchRole[]> {
  /*
   * Read every role, archived ones included, and drop the archived in memory.
   *
   * Eight of the nine built-ins go in already archived, so a read that filtered
   * them out in SQL could not tell a church that has them from a church that
   * has never had them, and the check below would write on every call. A church
   * has a dozen roles.
   */
  let rows = await readRoles(db, tenantId);

  /*
   * The built-ins are written only when they are actually missing or out of
   * date. This read used to open with an upsert of nine rows, every time, which
   * is nine row locks and a write-ahead log entry on the way into a screen that
   * changes nothing. The rows that come back answer the question the upsert was
   * asking, so the write happens on the first read after a church is created or
   * after a permission is added to the product, and not again.
   */
  if (needsBuiltIns(rows)) {
    await ensureBuiltIns(db, tenantId);
    rows = await readRoles(db, tenantId);
  }

  return shape(opts.includeArchived ? rows : rows.filter((row) => row.archivedAt === null));
}

/**
 * R1.6. How many of the church's own roles have been put away.
 *
 * The built-ins a church has not taken up are archived too, because the shelf
 * in the roles panel is where they are offered. They are the product's list, so
 * they are not counted here: this answers how many roles this church wrote and
 * later put away, which is what the link under the matrix goes to.
 */
export async function countArchivedRoles(db: Tx, tenantId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenantRoles)
    .where(and(
      eq(tenantRoles.tenantId, tenantId),
      eq(tenantRoles.builtin, false),
      sql`${tenantRoles.archivedAt} is not null`,
    ));
  return row?.count ?? 0;
}

/**
 * Whether the stored built-ins still say what the product says.
 *
 * A church that has edited one owns it from then on, so a customised row is
 * never counted as out of date.
 */
function needsBuiltIns(rows: readonly RoleRow[]): boolean {
  const builtins = new Map(rows.filter((row) => row.builtin).map((row) => [row.key, row]));
  return TENANT_ROLES.some((key) => {
    const row = builtins.get(key);
    if (!row) return true;
    if (row.customised) return false;
    const want = ROLE_PERMISSIONS[key];
    return (
      row.permissions.length !== want.length ||
      want.some((permission) => !row.permissions.includes(permission))
    );
  });
}

function shape(rows: readonly RoleRow[]): ChurchRole[] {
  return rows.map(({ archivedAt, customised: _customised, ...row }) => ({
    ...row,
    permissions: known(row.permissions),
    archived: archivedAt !== null,
    members: Number(row.members),
  }));
}

interface RoleRow {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  builtin: boolean;
  customised: boolean;
  position: number;
  archivedAt: Date | null;
  members: number;
}

async function readRoles(db: Tx, tenantId: string): Promise<RoleRow[]> {
  const rows = await db
    .select({
      id: tenantRoles.id,
      key: tenantRoles.key,
      name: tenantRoles.name,
      permissions: tenantRoles.permissions,
      builtin: tenantRoles.builtin,
      customised: tenantRoles.customised,
      position: tenantRoles.position,
      archivedAt: tenantRoles.archivedAt,
      members: sql<number>`(
        select count(*) from ${tenantMembers} m
        where m.tenant_id = ${tenantRoles.tenantId}
          and (m.role_id = ${tenantRoles.id}
               or (m.role_id is null and ${tenantRoles.builtin} and m.role::text = ${tenantRoles.key}))
      )`,
    })
    .from(tenantRoles)
    .where(eq(tenantRoles.tenantId, tenantId))
    .orderBy(asc(tenantRoles.position), asc(tenantRoles.name));

  return rows as RoleRow[];
}

/** The permissions one member holds, whichever kind of role they are on. */
export async function permissionsFor(
  db: Tx,
  tenantId: string,
  userId: string,
  fallback: TenantRole,
): Promise<Permission[]> {
  const [row] = await db
    .select({
      permissions: tenantRoles.permissions,
      key: tenantRoles.key,
      builtin: tenantRoles.builtin,
      customised: tenantRoles.customised,
    })
    .from(tenantMembers)
    .innerJoin(tenantRoles, eq(tenantRoles.id, tenantMembers.roleId))
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
    .limit(1);

  // No custom role means the built-in, which the matrix already answers for.
  if (!row) return [...ROLE_PERMISSIONS[fallback]];

  /*
   * A built-in the church has left alone answers from the matrix rather than
   * from its stored row.
   *
   * The stored copy is written when the church is first read and refreshed on
   * the roles screen, so a permission added to the product does not reach a
   * church that has not opened that screen. Reading the matrix here means a new
   * permission works for everybody on the built-ins the moment it ships, and a
   * church that has edited a role still owns every answer for it.
   */
  const key = row.key as TenantRole;
  if (row.builtin && !row.customised && ROLE_PERMISSIONS[key]) {
    return [...ROLE_PERMISSIONS[key]];
  }
  return known(row.permissions);
}

export async function createRole(
  db: Tx,
  actor: WriteActor,
  name: string,
  permissions: readonly string[] = [],
): Promise<ChurchRole> {
  guard(actor, "editRoles");

  const title = clean(name);
  if (!title) throw new InvalidInputError("roles.error.name");

  /*
   * R1.6. A role that holds nothing is a member with a different word on it.
   * The built-ins are exempt: Group leader holds none of these and still means
   * something, because being the leader of a group is read from the group.
   */
  if (known(permissions).length === 0) throw new InvalidInputError("roles.error.empty");

  // R1.6. A new role cannot be a way around what its author may not grant.
  onlyWhatTheyHold(actor, [], known(permissions));

  const key = slug(title);
  if (!key) throw new InvalidInputError("roles.error.name");

  const [clash] = await db
    .select({ id: tenantRoles.id })
    .from(tenantRoles)
    .where(and(eq(tenantRoles.tenantId, actor.tenantId), eq(tenantRoles.key, key)))
    .limit(1);
  if (clash) throw new NameTakenError("roles.error.taken", title, clash.id);

  const [row] = await db
    .insert(tenantRoles)
    .values({
      tenantId: actor.tenantId,
      key,
      name: title,
      permissions: known(permissions),
      builtin: false,
      position: TENANT_ROLES.length,
    })
    .returning();

  return {
    ...row!,
    permissions: known(row!.permissions),
    archived: false,
    members: 0,
  } as ChurchRole;
}

/**
 * R1.6. The Owner, which no church may narrow.
 *
 * Every other role is a default a church is free to change. Taking a permission
 * off the Owner is how a church locks itself out of its own account, and there
 * is nobody above them to put it back.
 */
const FIXED = "owner";

export async function renameRole(
  db: Tx,
  actor: WriteActor,
  id: string,
  name: string,
): Promise<void> {
  guard(actor, "editRoles");

  const title = clean(name);
  if (!title) throw new InvalidInputError("roles.error.name");

  const changed = await db
    .update(tenantRoles)
    .set({ name: title, customised: true })
    .where(and(
      eq(tenantRoles.id, id),
      eq(tenantRoles.tenantId, actor.tenantId),
      sql`${tenantRoles.key} <> ${FIXED}`,
    ))
    .returning({ id: tenantRoles.id });

  if (changed.length === 0) throw new InvalidInputError("roles.error.owner");
}

/** R1.6. Everything this role may do, written in one go. */
export async function setPermissions(
  db: Tx,
  actor: WriteActor,
  id: string,
  permissions: readonly string[],
): Promise<void> {
  guard(actor, "editRoles");

  const [row] = await db
    .select({
      key: tenantRoles.key,
      permissions: tenantRoles.permissions,
      builtin: tenantRoles.builtin,
      customised: tenantRoles.customised,
    })
    .from(tenantRoles)
    .where(and(eq(tenantRoles.id, id), eq(tenantRoles.tenantId, actor.tenantId)))
    .limit(1);

  if (!row) throw new InvalidInputError("roles.error.missing");
  if (row.key === FIXED) throw new InvalidInputError("roles.error.owner");

  const kept = known(permissions);

  /*
   * What the role holds now, read the way everything else reads it: a built-in
   * the church has left alone answers from the matrix rather than from its
   * stored row, which may predate a permission the product has since added.
   */
  const held = row.builtin && !row.customised && ROLE_PERMISSIONS[row.key as TenantRole]
    ? [...ROLE_PERMISSIONS[row.key as TenantRole]]
    : known(row.permissions);
  onlyWhatTheyHold(actor, held, kept);
  // R1.6. A church's own role that holds nothing is a member with a different
  // word on it. A built-in keeps whatever the product gave it.
  if (kept.length === 0 && row.key.startsWith("custom_")) {
    throw new InvalidInputError("roles.error.empty");
  }

  await db
    .update(tenantRoles)
    .set({ permissions: kept, customised: true })
    .where(eq(tenantRoles.id, id));
}

/**
 * R1.6. Puts a role away, or brings it back.
 *
 * Archived rather than deleted, like everything else: somebody held this role,
 * the audit log says so, and a church that puts Finance away in March will want
 * it back in January. An archived role comes off the matrix and off the list
 * anybody can be assigned to. Anyone still holding it keeps the permissions it
 * had, which is why a church takes their access away rather than taking the
 * role away underneath them.
 *
 * The Owner cannot be archived: a church with no Owner is a church nobody can
 * administer, and there is nobody above them to put it back.
 */
export async function archiveRole(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  guard(actor, "editRoles");

  /*
   * R1.5, R1.6, R21.2. Bringing a role back is held to the same reach as
   * writing one.
   *
   * A role off the list grants nobody anything. Putting it back on the list
   * makes it assignable, so an Admin who could restore Finance has handed out
   * `giving.amounts` by the other door, which is the rule in
   * `onlyWhatTheyHold` with an extra step in front of it.
   */
  if (!archived) {
    const [row] = await db
      .select({
        key: tenantRoles.key,
        permissions: tenantRoles.permissions,
        builtin: tenantRoles.builtin,
        customised: tenantRoles.customised,
      })
      .from(tenantRoles)
      .where(and(eq(tenantRoles.id, id), eq(tenantRoles.tenantId, actor.tenantId)))
      .limit(1);

    if (!row) throw new InvalidInputError("roles.error.missing");

    const key = row.key as TenantRole;
    const held = row.builtin && !row.customised && ROLE_PERMISSIONS[key]
      ? [...ROLE_PERMISSIONS[key]]
      : known(row.permissions);

    if (!withinReach(actor, held)) throw new InvalidInputError("roles.error.beyond");
  }

  const changed = await db
    .update(tenantRoles)
    .set({ archivedAt: archived ? new Date() : null })
    .where(and(
      eq(tenantRoles.id, id),
      eq(tenantRoles.tenantId, actor.tenantId),
      sql`${tenantRoles.key} <> ${FIXED}`,
    ))
    .returning({ id: tenantRoles.id });

  if (changed.length === 0) throw new InvalidInputError("roles.error.owner");
}
