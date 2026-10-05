import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { notifyRoles } from "./notifications";
import {
  groups, groupTypes, groupMemberships, groupJoinRequests, groupMeetings,
} from "../schema/groups";
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
  /** R9.2. The readable part of its address. */
  slug: string;
  /** R9.5. "draft" while the open web cannot see it yet. */
  status: "draft" | "published";
  name: string;
  description: string | null;
  typeId: string | null;
  typeName: string | null;
  typeHue: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  endsAt: string | null;
  frequency: string | null;
  location: string | null;
  capacity: number | null;
  forWhom: string | null;
  online: boolean;
  childrenWelcome: boolean;
  memberCount: number;
  /**
   * R9.3. Who runs it, named on the card.
   *
   * "Led by Maria Carter" is the line somebody reads before anything else about
   * a group, so it is carried by the list query rather than fetched per card.
   */
  leaderNames: string[];
  /** R9.5. Whether the finder offers to ask. */
  openToJoin: boolean;
  /** At or above what it holds, so somebody is not invited to ask for nothing. */
  full: boolean;
  /** Where this person stands with it already. */
  mine: boolean;
  requested: JoinStatus | null;
  /** R9.2. Off the finder for the church, on it for whoever runs groups. */
  listed: boolean;
  /** R9.2. The picture on the card, in the church bucket. */
  photoKey: string | null;
  archived: boolean;
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
    /** R9.5. Free text over the name and what the group says about itself. */
    q?: string;
    forWhom?: string;
    online?: boolean;
    childrenWelcome?: boolean;
    /**
     * R9.1. Whoever runs groups browses the same screen, with the unlisted and
     * the archived ones on it. Everybody else sees the church's finder.
     */
    manage?: boolean;
  } = {},
): Promise<FoundGroup[]> {
  const wheres = [
    opts.manage ? undefined : isNull(groups.archivedAt),
    opts.manage ? undefined : eq(groups.listed, true),
    opts.typeId ? eq(groups.typeId, opts.typeId) : undefined,
    opts.dayOfWeek !== undefined ? eq(groups.dayOfWeek, opts.dayOfWeek) : undefined,
    opts.location
      ? sql`lower(coalesce(${groups.location}, '')) like ${`%${opts.location.toLowerCase()}%`}`
      : undefined,
    opts.forWhom ? eq(groups.forWhom, opts.forWhom) : undefined,
    opts.online !== undefined ? eq(groups.online, opts.online) : undefined,
    opts.childrenWelcome !== undefined
      ? eq(groups.childrenWelcome, opts.childrenWelcome)
      : undefined,
    // One box over the name and the description, because somebody looking for a
    // group types "men" or "prayer" rather than opening a dropdown.
    opts.q?.trim()
      ? sql`(
          lower(${groups.name}) like ${`%${opts.q.trim().toLowerCase()}%`}
          or lower(coalesce(${groups.description}, '')) like ${`%${opts.q.trim().toLowerCase()}%`}
        )`
      : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      id: groups.id,
      slug: groups.slug,
      name: groups.name,
      description: groups.description,
      typeId: groups.typeId,
      dayOfWeek: groups.dayOfWeek,
      startsAt: groups.startsAt,
      endsAt: groups.endsAt,
      frequency: groups.frequency,
      location: groups.location,
      capacity: groups.capacity,
      forWhom: groups.forWhom,
      online: groups.online,
      childrenWelcome: groups.childrenWelcome,
      openToJoin: groups.openToJoin,
      listed: groups.listed,
      status: sql<"draft" | "published">`${groups.status}`,
      photoKey: groups.photoKey,
      archivedAt: groups.archivedAt,
      typeName: groupTypes.name,
      typeHue: groupTypes.hue,
      members: sql<string>`(
        select count(*) from group_memberships m
         where m.group_id = ${groups.id} and m.left_on is null
      )`,
      // Leaders and co-leaders, in the order a church would say them, as one
      // array so the card does not cost a query each.
      leaderNames: sql<string[]>`coalesce((
        select array_agg(
                 btrim(coalesce(nullif(btrim(p.preferred_name), ''), p.first_name)
                       || ' ' || coalesce(p.last_name, ''))
                 order by m.role, p.last_name
               )
          from group_memberships m
          join people p on p.id = m.person_id
         where m.group_id = ${groups.id}
           and m.left_on is null
           and m.role in ('leader', 'coleader')
      ), '{}')`,
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
      slug: row.slug,
      status: row.status,
      name: row.name,
      description: row.description,
      typeId: row.typeId,
      typeName: row.typeName,
      typeHue: row.typeHue,
      dayOfWeek: row.dayOfWeek,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      frequency: row.frequency,
      location: row.location,
      photoKey: row.photoKey,
      capacity: row.capacity,
      forWhom: row.forWhom,
      online: row.online,
      childrenWelcome: row.childrenWelcome,
      memberCount,
      leaderNames: row.leaderNames ?? [],
      openToJoin: row.openToJoin,
      full: row.capacity !== null && memberCount >= row.capacity,
      mine: mine.has(row.id),
      requested: asked.get(row.id) ?? null,
      listed: row.listed,
      archived: row.archivedAt !== null,
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

  // R9.5, R24.6. A leader decides who is in their group, so a leader has to
  // know the question was asked.
  if (row) {
    await notifyRoles(db, actor.tenantId, ["owner", "admin", "group_leader"], {
      kind: "join_request",
      messageKey: "bell.joinRequest",
      params: { name: row.personName, group: row.groupName },
      href: "/groups",
    });
  }
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

export interface GroupPage extends FoundGroup {
  typeDescription: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  /** R9.2. The day it stops meeting, where it has one. */
  endsOn: string | null;
  /** R9.3. Who runs it, which is who a newcomer is really asking about. */
  leaders: { personId: string; name: string }[];
  /** R9.7. Meetings that were held, most recent first. */
  past: { metOn: string; present: number }[];
}

/**
 * R9.5. One group's own page.
 *
 * Everything somebody deciding whether to turn up on Tuesday needs: what it is,
 * when and where, who runs it, and whether it is taking people. The leaders are
 * named because "who runs it" is the question behind most of the others.
 */
export async function groupPage(
  db: Tx,
  id: string,
  opts: { personId?: string | null; manage?: boolean } = {},
): Promise<GroupPage | null> {
  const [found] = await findGroups(db, { personId: opts.personId, manage: opts.manage }).then((all) =>
    all.filter((g) => g.id === id || g.slug === id),
  );
  if (!found) return null;

  const [extra] = await db
    .select({
      addressLine1: groups.addressLine1,
      addressLine2: groups.addressLine2,
      city: groups.city,
      region: groups.region,
      postalCode: groups.postalCode,
      country: groups.country,
      endsOn: sql<string | null>`${groups.endsOn}::text`,
      typeDescription: groupTypes.description,
    })
    .from(groups)
    .leftJoin(groupTypes, eq(groupTypes.id, groups.typeId))
    .where(eq(groups.id, id))
    .limit(1);

  const leaders = await db
    .select({
      personId: groupMemberships.personId,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
    })
    .from(groupMemberships)
    .innerJoin(people, eq(people.id, groupMemberships.personId))
    .where(
      and(
        eq(groupMemberships.groupId, id),
        isNull(groupMemberships.leftOn),
        inArray(groupMemberships.role, ["leader", "coleader"]),
      ),
    )
    .orderBy(asc(people.firstName));

  const past = await db
    .select({
      metOn: sql<string>`${groupMeetings.metOn}::text`,
      present: sql<string>`(
        select count(*) from group_attendance a where a.meeting_id = ${groupMeetings.id}
      )`,
    })
    .from(groupMeetings)
    .where(and(eq(groupMeetings.groupId, id), eq(groupMeetings.notHeld, false)))
    .orderBy(desc(groupMeetings.metOn))
    .limit(3);

  return {
    ...found,
    addressLine1: extra?.addressLine1 ?? null,
    addressLine2: extra?.addressLine2 ?? null,
    city: extra?.city ?? null,
    region: extra?.region ?? null,
    postalCode: extra?.postalCode ?? null,
    country: extra?.country ?? null,
    endsOn: extra?.endsOn ?? null,
    typeDescription: extra?.typeDescription ?? null,
    leaders: leaders.map((l) => ({ personId: l.personId, name: called(l) })),
    past: past.map((row) => ({ metOn: row.metOn, present: Number(row.present) })),
  };
}
