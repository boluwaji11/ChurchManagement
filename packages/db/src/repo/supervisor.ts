import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { checkinVisits, checkinRooms } from "../schema/checkin";
import { members, households, householdMemberships } from "../schema/members";
import { InvalidInputError } from "../errors";
import { canCheckIn } from "./checkin";
import { PermissionError, type TenantRole } from "../roles";
import { can, rolesWith, type Who } from "../permissions";

/**
 * R8.17 to R8.19. What the person walking the corridor needs to see.
 *
 * One screen for the whole of children's ministry during a service: every room, how
 * many children are in it, whether that is within what the room can hold,
 * whether there are enough volunteers, and who has still to be collected.
 *
 * The numbers are counted at read time rather than kept. A tally that drifts is
 * worse than no tally, because somebody will trust it.
 */

export const CAN_SUPERVISE: readonly TenantRole[] = rolesWith("checkin.supervise");

/**
 * R8.17. A class with fewer than two volunteers in it.
 *
 * The two-adult rule is the single most effective safeguarding practice a
 * church has, and it fails quietly: one volunteer steps out to find a parent
 * and nobody notices the class is down to one.
 *
 * The rule is counted here and shown nowhere yet, deliberately. Check-in puts
 * children into classes and nothing else, so the only honest source of who is
 * serving in a class is the serving schedule, which is F10 in 0.4. An alert fed
 * by nothing would read as "every class is fine", which is worse than no alert
 * at all. The board shows it the day serving provides the names.
 */
export const MIN_VOLUNTEERS = 2;

export interface RoomStatus {
  roomId: string;
  name: string;
  hue: string;
  /** Children in the room right now. */
  present: number;
  /** Children who have been collected. */
  collected: number;
  /** Adults checked in to this room, which is what serving in it means. */
  volunteers: number;
  capacity: number | null;
  /** One volunteer per this many children, where the church has said. */
  ratio: number | null;
  /** R8.15. At or above what the room holds. */
  full: boolean;
  over: boolean;
  /** R8.16. More children than the ratio allows for the volunteers present. */
  underStaffed: boolean;
  /** R8.17. Fewer than two volunteers, with children in the room. */
  twoAdultAlert: boolean;
}

export interface Board {
  rooms: RoomStatus[];
  /** R8.19. Children still to be collected, across every room. */
  outstanding: number;
  /** Adults checked in who are not in a room, so a supervisor can find them. */
  unassignedVolunteers: number;
}

/** R8.19. Every room, at this moment. */
export async function roomBoard(db: Tx, occurrenceId: string): Promise<Board> {
  const rooms = await db
    .select({
      id: checkinRooms.id,
      name: checkinRooms.name,
      hue: checkinRooms.hue,
      capacity: checkinRooms.capacity,
      ratio: checkinRooms.ratio,
      position: checkinRooms.position,
    })
    .from(checkinRooms)
    .where(isNull(checkinRooms.archivedAt))
    .orderBy(asc(checkinRooms.position), asc(checkinRooms.name));

  const counts = await db
    .select({
      roomId: checkinVisits.roomId,
      kind: checkinVisits.kind,
      out: sql<boolean>`${checkinVisits.checkedOutAt} is not null`,
      n: sql<string>`count(*)`,
    })
    .from(checkinVisits)
    .where(eq(checkinVisits.occurrenceId, occurrenceId))
    .groupBy(checkinVisits.roomId, checkinVisits.kind, sql`${checkinVisits.checkedOutAt} is not null`);

  const count = (roomId: string | null, kind: string, out: boolean): number =>
    Number(
      counts.find((c) => c.roomId === roomId && c.kind === kind && Boolean(c.out) === out)?.n ?? 0,
    );

  const statuses = rooms.map((room): RoomStatus => {
    const present = count(room.id, "child", false);
    const collected = count(room.id, "child", true);
    const volunteers = count(room.id, "adult", false);

    return {
      roomId: room.id,
      name: room.name,
      hue: room.hue,
      present,
      collected,
      volunteers,
      capacity: room.capacity,
      ratio: room.ratio,
      full: room.capacity !== null && present >= room.capacity,
      over: room.capacity !== null && present > room.capacity,
      underStaffed:
        room.ratio !== null && present > 0 && volunteers * room.ratio < present,
      twoAdultAlert: present > 0 && volunteers < MIN_VOLUNTEERS,
    };
  });

  return {
    rooms: statuses,
    outstanding: statuses.reduce((n, room) => n + room.present, 0),
    unassignedVolunteers: count(null, "adult", false),
  };
}

export interface RoomRosterEntry {
  /** R8.7. The visit, so a child can be collected from the class itself. */
  visitId: string;
  memberId: string;
  name: string;
  code: string | null;
  kind: string;
  checkedInAt: Date;
  checkedOutAt: Date | null;
  /** R8.10. What the room has to know, on the sheet pinned to its wall. */
  allergies: string | null;
  medicalNote: string | null;
}

/**
 * R8.18. One room's roster, printable.
 *
 * Who is in the room, who has been collected, and what each of them needs
 * somebody to know. It is printed because the room needs it on paper: the
 * tablet is at the desk in the lobby, and the volunteer holding a toddler is
 * not carrying one.
 */
export async function roomRoster(
  db: Tx,
  occurrenceId: string,
  roomId: string,
): Promise<RoomRosterEntry[]> {
  const rows = await db
    .select({
      visitId: checkinVisits.id,
      memberId: checkinVisits.memberId,
      code: checkinVisits.code,
      kind: checkinVisits.kind,
      checkedInAt: checkinVisits.checkedInAt,
      checkedOutAt: checkinVisits.checkedOutAt,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
      allergies: members.allergies,
      medicalNote: members.medicalNote,
    })
    .from(checkinVisits)
    .innerJoin(members, eq(members.id, checkinVisits.memberId))
    .where(and(eq(checkinVisits.occurrenceId, occurrenceId), eq(checkinVisits.roomId, roomId)))
    .orderBy(asc(members.firstName), asc(members.lastName));

  return rows.map((r) => ({
    visitId: r.visitId,
    memberId: r.memberId,
    name: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
    code: r.code,
    kind: r.kind,
    checkedInAt: r.checkedInAt,
    checkedOutAt: r.checkedOutAt,
    allergies: r.allergies,
    medicalNote: r.medicalNote,
  }));
}

/** R8.19. Everybody still in a room, for the end of the service. */
export async function stillHere(db: Tx, occurrenceId: string): Promise<RoomRosterEntry[]> {
  const rows = await db
    .select({
      visitId: checkinVisits.id,
      memberId: checkinVisits.memberId,
      code: checkinVisits.code,
      kind: checkinVisits.kind,
      checkedInAt: checkinVisits.checkedInAt,
      checkedOutAt: checkinVisits.checkedOutAt,
      roomName: checkinRooms.name,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
      allergies: members.allergies,
      medicalNote: members.medicalNote,
    })
    .from(checkinVisits)
    .innerJoin(members, eq(members.id, checkinVisits.memberId))
    .leftJoin(checkinRooms, eq(checkinRooms.id, checkinVisits.roomId))
    .where(
      and(
        eq(checkinVisits.occurrenceId, occurrenceId),
        isNull(checkinVisits.checkedOutAt),
        eq(checkinVisits.kind, "child"),
      ),
    )
    .orderBy(asc(checkinRooms.name), asc(members.firstName));

  return rows.map((r) => ({
    visitId: r.visitId,
    memberId: r.memberId,
    name: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
    code: r.code,
    kind: r.kind,
    checkedInAt: r.checkedInAt,
    checkedOutAt: r.checkedOutAt,
    allergies: r.allergies,
    medicalNote: r.medicalNote,
  }));
}

export function canSupervise(role: Who): boolean {
  return canCheckIn(role) || can(role, "checkin.supervise");
}

/** The board, refused to anybody who does not run check-in. */
export async function supervisorBoard(
  db: Tx,
  actor: { role: TenantRole },
  occurrenceId: string,
): Promise<Board> {
  if (!canSupervise(actor)) throw new PermissionError(actor.role, "checkIn");
  return roomBoard(db, occurrenceId);
}

export interface ArrivingChild {
  visitId: string;
  memberId: string;
  name: string;
  /** Years old, where the church holds a birthday. */
  age: number | null;
  /** Which family they came with, which is how a volunteer recognises them. */
  household: string | null;
  /** R8.10. The one line the volunteer has to read before they take the child. */
  allergies: string | null;
  code: string | null;
}

/** Whole years between a birthday and a date. */
function yearsOld(dob: string, today: string): number {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = (ty ?? 0) - (by ?? 0);
  if ((tm ?? 0) < (bm ?? 0) || ((tm ?? 0) === (bm ?? 0) && (td ?? 0) < (bd ?? 0))) age -= 1;
  return age;
}

/**
 * R8.14. The children who are here and are not in a class yet.
 *
 * A desk takes a family's name and prints their labels, and on a busy morning
 * the class a child goes to is decided by whoever is walking them down the
 * corridor. Those children sit here until somebody puts them in a room.
 */
export async function arriving(
  db: Tx,
  occurrenceId: string,
  today: string,
): Promise<ArrivingChild[]> {
  const rows = await db
    .select({
      visitId: checkinVisits.id,
      memberId: checkinVisits.memberId,
      code: checkinVisits.code,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
      dateOfBirth: members.dateOfBirth,
      allergies: members.allergies,
      household: households.name,
    })
    .from(checkinVisits)
    .innerJoin(members, eq(members.id, checkinVisits.memberId))
    .leftJoin(
      householdMemberships,
      and(
        eq(householdMemberships.memberId, members.id),
        isNull(householdMemberships.endedOn),
      ),
    )
    .leftJoin(households, eq(households.id, householdMemberships.householdId))
    .where(
      and(
        eq(checkinVisits.occurrenceId, occurrenceId),
        eq(checkinVisits.kind, "child"),
        isNull(checkinVisits.roomId),
        isNull(checkinVisits.checkedOutAt),
      ),
    )
    .orderBy(asc(checkinVisits.checkedInAt));

  return rows.map((r) => ({
    visitId: r.visitId,
    memberId: r.memberId,
    name: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
    age: r.dateOfBirth ? yearsOld(r.dateOfBirth, today) : null,
    household: r.household,
    allergies: r.allergies,
    code: r.code,
  }));
}

/**
 * R8.14, R8.15. Puts a child in a class, or moves them to another one.
 *
 * The room's capacity is the church's own number and it is enforced here rather
 * than on the screen that asked, because two members walking two children down
 * the corridor are two requests.
 */
export async function moveToRoom(
  db: Tx,
  actor: { role: TenantRole },
  visitId: string,
  roomId: string | null,
): Promise<void> {
  if (!canSupervise(actor)) throw new PermissionError(actor.role, "checkIn");

  const [visit] = await db
    .select({
      id: checkinVisits.id,
      occurrenceId: checkinVisits.occurrenceId,
      roomId: checkinVisits.roomId,
      checkedOutAt: checkinVisits.checkedOutAt,
    })
    .from(checkinVisits)
    .where(eq(checkinVisits.id, visitId))
    .limit(1);

  if (!visit) throw new InvalidInputError("board.error.missing");
  if (visit.checkedOutAt) throw new InvalidInputError("checkin.error.collected");
  if (visit.roomId === roomId) return;

  if (roomId !== null) {
    const [room] = await db
      .select({ id: checkinRooms.id, capacity: checkinRooms.capacity })
      .from(checkinRooms)
      .where(eq(checkinRooms.id, roomId))
      .limit(1);
    if (!room) throw new InvalidInputError("board.error.room");

    if (room.capacity !== null) {
      const [count] = await db
        .select({ present: sql<number>`count(*)::int` })
        .from(checkinVisits)
        .where(
          and(
            eq(checkinVisits.occurrenceId, visit.occurrenceId),
            eq(checkinVisits.roomId, roomId),
            eq(checkinVisits.kind, "child"),
            isNull(checkinVisits.checkedOutAt),
          ),
        );
      if ((count?.present ?? 0) >= room.capacity) {
        throw new InvalidInputError("board.error.full");
      }
    }
  }

  await db.update(checkinVisits).set({ roomId }).where(eq(checkinVisits.id, visitId));
}
