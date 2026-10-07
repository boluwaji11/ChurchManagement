/**
 * R1.6. The permission matrix.
 *
 * Every authorisation decision in the product comes from this table. A role is
 * a named set of permissions and nothing else, so `canEditPeople` is no longer
 * a list of roles somebody remembered to update: it is a lookup of
 * `members.edit` against whatever set this member's role holds.
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
  // R2.x. The members records.
  "members.edit",
  "members.archive",
  "members.households",
  "members.notes.confidential",

  // R13.x. Money.
  "giving.amounts",
  /**
   * R13.1, R13.9, R13.10. Running the giving: the funds, the batches the
   * counting team enters, and the church's own Stripe connection.
   *
   * Separate from reading amounts, because a treasurer records what came in
   * and a pastor may be allowed to see a total without being able to touch it.
   */
  "giving.manage",

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
  /**
   * R9.3. The leader of a group, for their own group and nobody else's.
   *
   * Narrow on purpose: it opens the roster and the attendance of a group this
   * person actually leads, which is read from the group rather than from here.
   * Without it a church writing its own leader role had nothing to tick.
   */
  "groups.lead",
  "services.manage",
  // R14.x. What the church is putting on, and who has a place at it.
  "events.manage",
  "teams.manage",
  "teams.lead",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * R1.6. The same permissions, in the order a person reads them.
 *
 * Twenty rows of equal weight is a list nobody can hold in their head, and the
 * question somebody actually arrives with is narrower than the list: what can
 * this role do with our members, what can it do at check-in, what can it change
 * about the church. The groups are the screen's order, and the permissions
 * above stay the authority on what exists.
 */
export const PERMISSION_GROUPS = [
  {
    key: "members",
    permissions: [
      "members.edit", "members.archive", "members.households", "members.notes.confidential",
    ],
  },
  {
    key: "checkin",
    permissions: [
      "checkin.run", "checkin.supervise", "checkin.rooms", "checkin.stations",
      "checkin.incidents", "checkin.checks",
    ],
  },
  {
    key: "week",
    permissions: [
      "services.manage", "teams.manage", "teams.lead",
      "groups.manage", "groups.lead", "events.manage", "followups.manage",
    ],
  },
  { key: "church", permissions: ["church.manage", "church.fields", "church.tags"] },
  { key: "money", permissions: ["giving.amounts", "giving.manage"] },
] as const satisfies readonly { key: string; permissions: readonly Permission[] }[];

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number]["key"];

/**
 * The matrix.
 *
 * Owner holds everything by construction rather than by listing, because a
 * permission added above must never silently leave the Owner unable to run
 * their own church.
 */
const GRANTS: Record<Exclude<TenantRole, "owner">, readonly Permission[]> = {
  admin: [
    "members.edit", "members.archive", "members.households",
    "church.manage", "church.fields", "church.tags",
    "checkin.rooms", "checkin.stations", "checkin.run", "checkin.supervise",
    "checkin.incidents", "checkin.checks",
    "followups.manage", "groups.manage", "services.manage", "events.manage",
    "teams.manage", "teams.lead",
  ],
  staff: [
    "members.edit", "members.households",
    "checkin.run", "checkin.supervise",
    "followups.manage", "groups.manage", "services.manage", "events.manage",
    "teams.manage", "teams.lead",
  ],
  finance: ["giving.amounts", "giving.manage"],
  pastoral: [
    "members.notes.confidential",
    "checkin.incidents", "checkin.checks",
    "followups.manage", "groups.manage",
  ],
  group_leader: ["groups.lead"],
  team_leader: ["teams.lead", "groups.lead"],
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
