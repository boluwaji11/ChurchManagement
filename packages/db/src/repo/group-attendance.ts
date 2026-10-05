import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { groups, groupMeetings, groupAttendance, groupMemberships } from "../schema/groups";
import { members } from "../schema/members";
import { PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";
import { canManageGroups } from "./groups";
import { personForUser } from "./scope";

/**
 * R9.7, R7.4. Group attendance.
 *
 * The hard part of group attendance is not the query, it is getting a volunteer
 * leader to record anything at all on a Tuesday night with their coat on. So
 * the shape of this is one screen, one submit, and a default that is right most
 * weeks: everybody on the roster starts present, the leader taps the two who
 * were not there, and submits.
 *
 * "We did not meet" is a recorded fact rather than a missing row. A group that
 * was cancelled and a group whose leader forgot look identical otherwise, and
 * only one of those is a problem a pastor should chase.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface Meeting {
  id: string;
  groupId: string;
  metOn: string;
  notHeld: boolean;
  note: string | null;
  /** How many of the roster were there. */
  present: number;
  /** How many were on the roster that day. */
  roster: number;
}

export interface MeetingPerson {
  memberId: string;
  name: string;
  role: string;
  present: boolean;
}

/**
 * R9.3. Who may record for this group.
 *
 * Staff and up for any group. A leader or co-leader for their own, which is the
 * point of the role: the person in the room records the room.
 */
export async function canRecordFor(
  db: Tx,
  actor: { role: TenantRole; userId?: string | null },
  groupId: string,
): Promise<boolean> {
  if (canManageGroups(actor.role)) return true;
  if (actor.role !== "group_leader" && actor.role !== "team_leader") return false;
  if (!actor.userId) return false;

  const self = await personForUser(db, actor.userId);
  if (!self) return false;

  const [row] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.memberId, self),
        isNull(groupMemberships.leftOn),
        inArray(groupMemberships.role, ["leader", "coleader"]),
      ),
    )
    .limit(1);

  return Boolean(row);
}

async function mustRecord(
  db: Tx,
  actor: WriteActor & { userId?: string | null },
  groupId: string,
): Promise<void> {
  if (!(await canRecordFor(db, actor, groupId))) {
    throw new PermissionError(actor.role, "recordGroupAttendance");
  }
}

/**
 * R9.7. The meeting for a day, created if this is the first time it is opened.
 *
 * Opening is what creates it, because asking a leader to create a meeting and
 * then fill it in is two steps where there is one.
 */
export async function openMeeting(
  db: Tx,
  actor: WriteActor & { userId?: string | null },
  input: { groupId: string; metOn: string },
): Promise<{ meeting: Meeting; members: MeetingPerson[] }> {
  await mustRecord(db, actor, input.groupId);
  if (!DATE.test(input.metOn)) throw new InvalidInputError("meeting.error.date");

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (!group) throw new InvalidInputError("group.error.missing");

  await db
    .insert(groupMeetings)
    .values({
      tenantId: actor.tenantId,
      groupId: input.groupId,
      metOn: input.metOn,
      recordedBy: actor.userId ?? null,
    })
    .onConflictDoNothing({ target: [groupMeetings.groupId, groupMeetings.metOn] });

  const [row] = await db
    .select({ id: groupMeetings.id })
    .from(groupMeetings)
    .where(and(eq(groupMeetings.groupId, input.groupId), eq(groupMeetings.metOn, input.metOn)))
    .limit(1);

  return readMeeting(db, row!.id);
}

async function readMeeting(
  db: Tx,
  meetingId: string,
): Promise<{ meeting: Meeting; members: MeetingPerson[] }> {
  const [meeting] = await db
    .select({
      id: groupMeetings.id,
      groupId: groupMeetings.groupId,
      metOn: sql<string>`${groupMeetings.metOn}::text`,
      notHeld: groupMeetings.notHeld,
      note: groupMeetings.note,
    })
    .from(groupMeetings)
    .where(eq(groupMeetings.id, meetingId))
    .limit(1);
  if (!meeting) throw new InvalidInputError("meeting.error.missing");

  const roster = await db
    .select({
      memberId: groupMemberships.memberId,
      role: groupMemberships.role,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
    })
    .from(groupMemberships)
    .innerJoin(members, eq(members.id, groupMemberships.memberId))
    .where(and(eq(groupMemberships.groupId, meeting.groupId), isNull(groupMemberships.leftOn)))
    .orderBy(asc(members.firstName), asc(members.lastName));

  const marked = await db
    .select({ memberId: groupAttendance.memberId })
    .from(groupAttendance)
    .where(eq(groupAttendance.meetingId, meetingId));
  const here = new Set(marked.map((m) => m.memberId));

  const list: MeetingPerson[] = roster.map((r) => ({
    memberId: r.memberId,
    name: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
    role: r.role,
    present: here.has(r.memberId),
  }));

  return {
    meeting: {
      ...meeting,
      present: list.filter((p) => p.present).length,
      roster: list.length,
    },
    members: list,
  };
}

/**
 * R9.7. The submit.
 *
 * The whole meeting in one write: who was there, who was not, and whether it
 * happened at all. One call rather than one a person, because a leader on a
 * phone at the end of an evening gets one chance at a network.
 */
export async function recordMeeting(
  db: Tx,
  actor: WriteActor & { userId?: string | null },
  input: {
    meetingId: string;
    presentIds: string[];
    notHeld?: boolean;
    note?: string | null;
  },
): Promise<{ meeting: Meeting; members: MeetingPerson[] }> {
  const [meeting] = await db
    .select({ id: groupMeetings.id, groupId: groupMeetings.groupId })
    .from(groupMeetings)
    .where(eq(groupMeetings.id, input.meetingId))
    .limit(1);
  if (!meeting) throw new InvalidInputError("meeting.error.missing");

  await mustRecord(db, actor, meeting.groupId);

  const notHeld = input.notHeld === true;

  await db
    .update(groupMeetings)
    .set({
      notHeld,
      note: input.note?.trim() || null,
      recordedBy: actor.userId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(groupMeetings.id, input.meetingId));

  // A meeting that did not happen has nobody at it. Marking it not held after
  // ticking names clears the names rather than keeping a contradiction.
  const present = notHeld ? [] : [...new Set(input.presentIds)];

  await db.delete(groupAttendance).where(eq(groupAttendance.meetingId, input.meetingId));

  if (present.length > 0) {
    // Only members actually on the roster, so a request naming somebody else
    // cannot write them into a group they are not in.
    const roster = await db
      .select({ memberId: groupMemberships.memberId })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, meeting.groupId),
          isNull(groupMemberships.leftOn),
          inArray(groupMemberships.memberId, present),
        ),
      );

    if (roster.length > 0) {
      await db.insert(groupAttendance).values(
        roster.map((r) => ({
          tenantId: actor.tenantId,
          meetingId: input.meetingId,
          memberId: r.memberId,
        })),
      );
    }
  }

  return readMeeting(db, input.meetingId);
}

/** R9.7. What has been recorded for a group, most recent first. */
export async function meetingsFor(
  db: Tx,
  groupId: string,
  opts: { limit?: number } = {},
): Promise<Meeting[]> {
  const rows = await db
    .select({
      id: groupMeetings.id,
      groupId: groupMeetings.groupId,
      metOn: sql<string>`${groupMeetings.metOn}::text`,
      notHeld: groupMeetings.notHeld,
      note: groupMeetings.note,
      present: sql<string>`(
        select count(*) from group_attendance a where a.meeting_id = ${groupMeetings.id}
      )`,
    })
    .from(groupMeetings)
    .where(eq(groupMeetings.groupId, groupId))
    .orderBy(desc(groupMeetings.metOn))
    .limit(opts.limit ?? 12);

  const [roster] = await db
    .select({ n: sql<string>`count(*)` })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), isNull(groupMemberships.leftOn)));

  return rows.map((row) => ({
    ...row,
    present: Number(row.present),
    roster: Number(roster?.n ?? 0),
  }));
}

/** Every meeting somebody was at, for their record. */
export async function groupAttendanceFor(
  db: Tx,
  memberId: string,
  opts: { limit?: number } = {},
): Promise<{ groupId: string; groupName: string; metOn: string }[]> {
  const rows = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      metOn: sql<string>`${groupMeetings.metOn}::text`,
    })
    .from(groupAttendance)
    .innerJoin(groupMeetings, eq(groupMeetings.id, groupAttendance.meetingId))
    .innerJoin(groups, eq(groups.id, groupMeetings.groupId))
    .where(eq(groupAttendance.memberId, memberId))
    .orderBy(desc(groupMeetings.metOn))
    .limit(opts.limit ?? 24);

  return rows;
}

/**
 * The day a group last met, which is what the attendance screen opens on.
 *
 * The group's own meeting day where it has one, counting back from today, so a
 * leader recording on Wednesday morning is offered Tuesday rather than today.
 */
export function lastMeetingDay(dayOfWeek: number | null, today: string): string {
  if (dayOfWeek === null || !DATE.test(today)) return today;

  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  const back = (date.getUTCDay() - dayOfWeek + 7) % 7;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}
