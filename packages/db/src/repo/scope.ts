import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Tx } from "../client";
import { people } from "../schema/people";
import { groupMemberships } from "../schema/groups";
import { teamMembers } from "../schema/serving";
import type { TenantRole } from "../roles";

/**
 * R9.3, R1.5. What a role may see of the directory.
 *
 * Most roles see the whole church. A group leader sees the people in the groups
 * they lead, and nobody else, which is the whole point of giving somebody that
 * role: a church can let the leader of the Tuesday group keep their own roster
 * without handing them four hundred phone numbers.
 *
 * It is decided here rather than in a page, because a scope enforced by a
 * template is not a scope. Every repository that returns people asks this
 * first, and a caller that forgets to pass an actor gets the restricted answer
 * rather than the open one.
 */

/** Roles that see the directory whole. */
const SEES_EVERYONE: readonly TenantRole[] = [
  "owner", "admin", "staff", "pastoral", "finance", "checkin_volunteer",
];

/** The roles whose view is limited to something they are part of. */
export const SCOPED_ROLES: readonly TenantRole[] = ["group_leader", "team_leader", "member"];

export interface Viewer {
  role: TenantRole;
  /** The signed-in account. Null for a path with no user, such as an export. */
  userId?: string | null;
}

/**
 * The people this viewer may see, or null for all of them.
 *
 * Null means no restriction. An empty array means they may see nobody, which is
 * what a group leader who leads nothing gets, and it is deliberately not the
 * same as null.
 */
export async function visiblePeople(db: Tx, viewer: Viewer): Promise<string[] | null> {
  if (SEES_EVERYONE.includes(viewer.role)) return null;
  if (!viewer.userId) return [];

  const self = await personForUser(db, viewer.userId);

  if (viewer.role === "member") {
    // A member sees themselves. The member-facing directory (R3.x) is a
    // separate surface with its own per-field privacy, and it is not this one.
    return self ? [self] : [];
  }

  if (!self) return [];

  const led = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.personId, self),
        isNull(groupMemberships.leftOn),
        inArray(groupMemberships.role, ["leader", "coleader"]),
      ),
    );

  const groupIds = led.map((row) => row.groupId);

  const roster = groupIds.length === 0
    ? []
    : await db
      .selectDistinct({ personId: groupMemberships.personId })
      .from(groupMemberships)
      .where(and(inArray(groupMemberships.groupId, groupIds), isNull(groupMemberships.leftOn)));

  // R10.1. A team leader sees their own band and nobody else, for the same
  // reason a group leader sees their own group: they have to keep the rota.
  const teamsLed = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.personId, self),
      eq(teamMembers.role, "leader"),
      isNull(teamMembers.leftOn),
    ));

  const teamIds = teamsLed.map((row) => row.teamId);

  const servers = teamIds.length === 0
    ? []
    : await db
      .selectDistinct({ personId: teamMembers.personId })
      .from(teamMembers)
      .where(and(inArray(teamMembers.teamId, teamIds), isNull(teamMembers.leftOn)));

  return [...new Set([
    self,
    ...roster.map((row) => row.personId),
    ...servers.map((row) => row.personId),
  ])];
}

/** R9.3. Which person this account is in this church, where they are one. */
export async function personForUser(db: Tx, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.appUserId, userId), isNull(people.archivedAt)))
    .limit(1);
  return row?.id ?? null;
}

/** R9.3. Ties an account to the person record it belongs to. */
export async function linkPersonToUser(
  db: Tx,
  personId: string,
  userId: string | null,
): Promise<void> {
  await db.update(people).set({ appUserId: userId }).where(eq(people.id, personId));
}

/** Whether this viewer may see this one person. */
export async function canSeePerson(db: Tx, viewer: Viewer, personId: string): Promise<boolean> {
  const allowed = await visiblePeople(db, viewer);
  return allowed === null || allowed.includes(personId);
}
