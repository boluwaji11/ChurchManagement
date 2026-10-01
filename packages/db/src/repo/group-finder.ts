import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { groups, groupTypes, groupMemberships, groupJoinRequests } from "../schema/groups";
import { people } from "../schema/people";
import { PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";
import { canManageGroups } from "./groups";
import { canRecordFor } from "./group-attendance";
import { personForUser } from "./scope";

/**
 * R9.5, R9.6. Finding a group and asking to join it.
 *
 * This is the one screen in groups that a member of the church sees, and the
 * only thing it has to do well is answer "is there something for me on a
 * Tuesday". So it filters by the three things people actually ask about: what
 * kind of group, which night, and whereabouts.
 *
 * Asking is a request rather than a join. A group has a leader and a capacity,
 * and sometimes a reason to say no. The decision is kept either way, because a
 * church that declines somebody and keeps no record of it cannot answer them
 * three months later when they ask why they never heard back.
 */

export const JOIN_STATUSES = ["pending", "approved", "declined"] as const;
export type JoinStatus = (typeof JOIN_STATUSES)[number];

export interface FoundGroup {
  id: string;
  name: string;
  description: string | null;
  typeId: string | null;
  typeName: string | null;
  typeHue: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  frequency: string | null;
  location: string | null;
  capacity: number | null;
  memberCount: number;
  /** R9.5. Whether the finder offers to ask. */
  openToJoin: boolean;
  /** At or above what it holds, so somebody is not invited to ask for nothing. */
  full: boolean;
  /** Where this person stands with it already. */
  mine: boolean;
  requested: JoinStatus | null;
}

export interface JoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  personId: string;
  personName: string;
  message: string | null;
  status: string;
  decidedAt: Date | null;
  notifiedAt: Date | null;
  createdAt: Date;
}

const called = (row: { firstName: string; lastName: string; preferredName: string | null }) =>
  `${row.preferredName?.trim() || row.firstName} ${row.lastName}`;

/**
 * R9.5. The groups a member may browse.
 *
 * Listed groups only, archived ones never. A group that is closed or full is
 * still shown, because somebody looking for a Tuesday group should see that the
 * church has one rather than conclude it has none.
 */
export async function findGroups(
  db: Tx,
  opts: {
    personId?: string | null;
    typeId?: string;
    dayOfWeek?: number;
    /** Matched anywhere in the location, since people type "hall" not "The Hall". */
    location?: string;
  } = {},
): Promise<FoundGroup[]> {
  const wheres = [
    isNull(groups.archivedAt),
    eq(groups.listed, true),
    opts.typeId ? eq(groups.typeId, opts.typeId) : undefined,
    opts.dayOfWeek !== undefined ? eq(groups.dayOfWeek, opts.dayOfWeek) : undefined,
    opts.location
      ? sql`lower(coalesce(${groups.location}, '')) like ${`%${opts.location.toLowerCase()}%`}`
      : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      typeId: groups.typeId,
      dayOfWeek: groups.dayOfWeek,
      startsAt: groups.startsAt,
      frequency: groups.frequency,
      location: groups.location,
      capacity: groups.capacity,
      openToJoin: groups.openToJoin,
      typeName: groupTypes.name,
      typeHue: groupTypes.hue,
      members: sql<string>`(
        select count(*) from group_memberships m
         where m.group_id = ${groups.id} and m.left_on is null
      )`,
    })
    .from(groups)
    .leftJoin(groupTypes, eq(groupTypes.id, groups.typeId))
    .where(and(...(wheres as never[])))
    .orderBy(asc(groups.dayOfWeek), asc(groups.startsAt), asc(groups.name));

  const mine = new Set<string>();
  const asked = new Map<string, JoinStatus>();

  if (opts.personId) {
    const memberships = await db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(and(eq(groupMemberships.personId, opts.personId), isNull(groupMemberships.leftOn)));
    for (const row of memberships) mine.add(row.groupId);

    const requests = await db
      .select({ groupId: groupJoinRequests.groupId, status: groupJoinRequests.status })
      .from(groupJoinRequests)
      .where(eq(groupJoinRequests.personId, opts.personId))
      .orderBy(desc(groupJoinRequests.createdAt));
    for (const row of requests) {
      if (!asked.has(row.groupId)) asked.set(row.groupId, row.status as JoinStatus);
    }
  }

  return rows.map((row) => {
    const memberCount = Number(row.members);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      typeId: row.typeId,
      typeName: row.typeName,
      typeHue: row.typeHue,
      dayOfWeek: row.dayOfWeek,
      startsAt: row.startsAt,
      frequency: row.frequency,
      location: row.location,
      capacity: row.capacity,
      memberCount,
      openToJoin: row.openToJoin,
      full: row.capacity !== null && memberCount >= row.capacity,
      mine: mine.has(row.id),
      requested: asked.get(row.id) ?? null,
    };
  });
}

/**
 * R9.5. Asking to join.
 *
 * Anybody signed in with a person record may ask. Asking twice is the same
 * asking: the open request stands rather than becoming two for a leader to
 * work through.
 */
export async function requestToJoin(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string | null },
  input: { groupId: string; message?: string | null },
): Promise<JoinRequest> {
  const self = actor.userId ? await personForUser(db, actor.userId) : null;
  if (!self) throw new InvalidInputError("join.error.noPerson");

  const [group] = await db
    .select({ id: groups.id, openToJoin: groups.openToJoin, listed: groups.listed })
    .from(groups)
    .where(and(eq(groups.id, input.groupId), isNull(groups.archivedAt)))
    .limit(1);
  if (!group) throw new InvalidInputError("group.error.missing");
  if (!group.openToJoin || !group.listed) throw new InvalidInputError("join.error.closed");

  const [already] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, input.groupId),
        eq(groupMemberships.personId, self),
        isNull(groupMemberships.leftOn),
      ),
    )
    .limit(1);
  if (already) throw new InvalidInputError("join.error.member");

  await db
    .insert(groupJoinRequests)
    .values({
      tenantId: actor.tenantId,
      groupId: input.groupId,
      personId: self,
      message: input.message?.trim() || null,
    })
    .onConflictDoNothing();

  const [row] = await requestsWhere(
    db,
    and(
      eq(groupJoinRequests.groupId, input.groupId),
      eq(groupJoinRequests.personId, self),
      eq(groupJoinRequests.status, "pending"),
    )!,
  );
  return row!;
}

async function requestsWhere(db: Tx, where: ReturnType<typeof eq>): Promise<JoinRequest[]> {
  const rows = await db
    .select({
      id: groupJoinRequests.id,
      groupId: groupJoinRequests.groupId,
      personId: groupJoinRequests.personId,
      message: groupJoinRequests.message,
      status: groupJoinRequests.status,
      decidedAt: groupJoinRequests.decidedAt,
      notifiedAt: groupJoinRequests.notifiedAt,
      createdAt: groupJoinRequests.createdAt,
      groupName: groups.name,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
    })
    .from(groupJoinRequests)
    .innerJoin(groups, eq(groups.id, groupJoinRequests.groupId))
    .innerJoin(people, eq(people.id, groupJoinRequests.personId))
    .where(where)
    .orderBy(desc(groupJoinRequests.createdAt));

  return rows.map((r) => ({
    id: r.id,
    groupId: r.groupId,
    groupName: r.groupName,
    personId: r.personId,
    personName: called(r),
    message: r.message,
    status: r.status,
    decidedAt: r.decidedAt,
    notifiedAt: r.notifiedAt,
    createdAt: r.createdAt,
  }));
}

/**
 * R9.6. The requests waiting on somebody.
 *
 * A leader sees their own groups' requests. Staff and up see every one, because
 * somebody has to notice the request sitting under a leader who stopped
 * checking.
 */
export async function pendingRequests(
  db: Tx,
  actor: { role: TenantRole; userId?: string | null },
): Promise<JoinRequest[]> {
  if (canManageGroups(actor.role)) {
    return requestsWhere(db, eq(groupJoinRequests.status, "pending"));
  }

  const self = actor.userId ? await personForUser(db, actor.userId) : null;
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
  if (led.length === 0) return [];

  return requestsWhere(
    db,
    and(
      eq(groupJoinRequests.status, "pending"),
      inArray(groupJoinRequests.groupId, led.map((row) => row.groupId)),
    )!,
  );
}

/** What somebody has asked for, for the finder to show them. */
export async function requestsFor(db: Tx, personId: string): Promise<JoinRequest[]> {
  return requestsWhere(db, eq(groupJoinRequests.personId, personId));
}

/**
 * R9.6. The leader's answer.
 *
 * Approving puts them on the roster in the same breath, because a leader who
 * says yes and then has to go and add them will forget the second half.
 *
 * `notifiedAt` is set when the answer is sent. Nothing sends it yet: messaging
 * runs on the church's own provider (R9.8, HRT-87), and until that is built the
 * finder shows the person their answer instead. The column is here so the day
 * it is built, the queue of who has not been told is already a query.
 */
export async function decideRequest(
  db: Tx,
  actor: WriteActor & { userId?: string | null },
  input: { requestId: string; approve: boolean },
): Promise<JoinRequest> {
  const [request] = await db
    .select({
      id: groupJoinRequests.id,
      groupId: groupJoinRequests.groupId,
      personId: groupJoinRequests.personId,
      status: groupJoinRequests.status,
    })
    .from(groupJoinRequests)
    .where(eq(groupJoinRequests.id, input.requestId))
    .limit(1);
  if (!request) throw new InvalidInputError("join.error.missing");

  if (!(await canRecordFor(db, actor, request.groupId))) {
    throw new PermissionError(actor.role, "manageGroups");
  }
  if (request.status !== "pending") throw new InvalidInputError("join.error.decided");

  await db
    .update(groupJoinRequests)
    .set({
      status: input.approve ? "approved" : "declined",
      decidedBy: actor.userId ?? null,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(groupJoinRequests.id, input.requestId));

  if (input.approve) {
    await db
      .insert(groupMemberships)
      .values({
        tenantId: actor.tenantId,
        groupId: request.groupId,
        personId: request.personId,
        role: "member",
        joinedOn: new Date().toISOString().slice(0, 10),
      })
      .onConflictDoNothing();
  }

  const [row] = await requestsWhere(db, eq(groupJoinRequests.id, input.requestId));
  return row!;
}

/** R9.6. Answers nobody has been told about yet, for when sending exists. */
export async function unnotifiedDecisions(db: Tx): Promise<JoinRequest[]> {
  return requestsWhere(
    db,
    and(
      inArray(groupJoinRequests.status, ["approved", "declined"]),
      isNull(groupJoinRequests.notifiedAt),
    )!,
  );
}

export async function markNotified(db: Tx, requestId: string): Promise<void> {
  await db
    .update(groupJoinRequests)
    .set({ notifiedAt: new Date() })
    .where(eq(groupJoinRequests.id, requestId));
}
