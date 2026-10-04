/**
 * R1.6. The permission matrix.
 *
 * Every authorisation decision in the product comes from this table. A role is
 * a named set of permissions and nothing else, so `canEditPeople` is no longer
 * a list of roles somebody remembered to update: it is a lookup of
 * `people.edit` against whatever set this member's role holds.
 *
 * The nine built-in roles (R1.4) are rows in the table like any other. They are
 * written here rather than in the database so a fresh church has working
 * permissions before anything is seeded, and so a church that has never touched
 * roles keeps getting ours as we correct them.
 *
 * Pure data and pure functions. No database, no i18n, so a station can answer
 * "may this volunteer do this" offline.
 */

/** R1.4. The built-in roles, widest reach first. */
export const TENANT_ROLES = [
  "owner", "admin", "staff", "finance", "pastoral",
  "group_leader", "team_leader", "checkin_volunteer", "member",
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

/**
 * Every permission a role can hold, grouped by what it acts on.
 *
 * Adding one here and nowhere else gives every role nothing, which is the right
 * default: a permission that has to be granted is a permission somebody decided
 * to grant.
 */
export const PERMISSIONS = [
  // R2.x. The people records.
  "people.edit",
  "people.archive",
  "people.households",
  "people.notes.confidential",

  // R13.x. Money. The permission exists now so the rule is not invented later.
  "giving.amounts",

  // R1.x. The church itself.
  "church.manage",
  "church.fields",
  "church.tags",

  // R8.x. Check-in, which is safety-critical.
  "checkin.rooms",
  "checkin.stations",
  "checkin.run",
  "checkin.supervise",
  "checkin.incidents",
  "checkin.checks",

  // R5.x, R9.x, R7.x, R10.x. The week's work.
  "followups.manage",
  "groups.manage",
  "services.manage",
  "teams.manage",
  "teams.lead",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * The matrix.
 *
 * Owner holds everything by construction rather than by listing, because a
 * permission added above must never silently leave the Owner unable to run
 * their own church.
 */
const GRANTS: Record<Exclude<TenantRole, "owner">, readonly Permission[]> = {
  admin: [
    "people.edit", "people.archive", "people.households",
    "church.manage", "church.fields", "church.tags",
    "checkin.rooms", "checkin.stations", "checkin.run", "checkin.supervise",
    "checkin.incidents", "checkin.checks",
    "followups.manage", "groups.manage", "services.manage",
    "teams.manage", "teams.lead",
  ],
  staff: [
    "people.edit", "people.households",
    "checkin.run", "checkin.supervise",
    "followups.manage", "groups.manage", "services.manage",
    "teams.manage", "teams.lead",
  ],
  finance: ["giving.amounts"],
  pastoral: [
    "people.notes.confidential",
    "checkin.incidents", "checkin.checks",
    "followups.manage", "groups.manage",
  ],
  group_leader: [],
  team_leader: ["teams.lead"],
  checkin_volunteer: ["checkin.run", "checkin.supervise"],
  member: [],
};

export const ROLE_PERMISSIONS: Record<TenantRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  ...GRANTS,
};

/**
 * Whoever a permission is being checked for.
 *
 * A built-in role answers from the matrix above. Somebody on a role their church
 * wrote carries the set that role holds, read once when their session was built,
 * and it is used in place of the matrix.
 */
export type Who = TenantRole | { role: TenantRole; permissions?: readonly Permission[] | null };

/** Whether somebody holds a permission. The one question the whole matrix answers. */
export function can(who: Who, permission: Permission): boolean {
  if (typeof who === "string") return ROLE_PERMISSIONS[who].includes(permission);
  if (who.permissions) return who.permissions.includes(permission);
  return ROLE_PERMISSIONS[who.role].includes(permission);
}

/**
 * The roles holding a permission, in the order roles are listed.
 *
 * Every `CAN_SOMETHING` list in the repositories is derived through this, so a
 * change to the matrix reaches the query layer without anybody editing a second
 * copy of the answer.
 */
export function rolesWith(permission: Permission): readonly TenantRole[] {
  return TENANT_ROLES.filter((role) => can(role, permission));
}
