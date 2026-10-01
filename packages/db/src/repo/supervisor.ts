import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { checkinVisits, checkinRooms } from "../schema/checkin";
import { people } from "../schema/people";
import { canCheckIn } from "./checkin";
import { PermissionError, type TenantRole } from "../roles";

/**
 * R8.17 to R8.19. What the person walking the corridor needs to see.
 *
 * One screen for the whole of children's ministry on a Sunday: every room, how
 * many children are in it, whether that is within what the room can hold,
 * whether there are enough volunteers, and who has still to be collected.
 *
 * The numbers are counted at read time rather than kept. A tally that drifts is
 * worse than no tally, because somebody will trust it.
 */

export const CAN_SUPERVISE: readonly TenantRole[] = ["owner", "admin", "staff", "checkin_volunteer"];

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
  personId: string;
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
      personId: checkinVisits.personId,
      code: checkinVisits.code,
      kind: checkinVisits.kind,
      checkedInAt: checkinVisits.checkedInAt,
      checkedOutAt: checkinVisits.checkedOutAt,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      allergies: people.allergies,
      medicalNote: people.medicalNote,
    })
    .from(checkinVisits)
    .innerJoin(people, eq(people.id, checkinVisits.personId))
    .where(and(eq(checkinVisits.occurrenceId, occurrenceId), eq(checkinVisits.roomId, roomId)))
    .orderBy(asc(people.firstName), asc(people.lastName));

  return rows.map((r) => ({
    visitId: r.visitId,
    personId: r.personId,
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
      personId: checkinVisits.personId,
      code: checkinVisits.code,
      kind: checkinVisits.kind,
      checkedInAt: checkinVisits.checkedInAt,
      checkedOutAt: checkinVisits.checkedOutAt,
      roomName: checkinRooms.name,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      allergies: people.allergies,
      medicalNote: people.medicalNote,
    })
    .from(checkinVisits)
    .innerJoin(people, eq(people.id, checkinVisits.personId))
    .leftJoin(checkinRooms, eq(checkinRooms.id, checkinVisits.roomId))
    .where(
      and(
        eq(checkinVisits.occurrenceId, occurrenceId),
        isNull(checkinVisits.checkedOutAt),
        eq(checkinVisits.kind, "child"),
      ),
    )
    .orderBy(asc(checkinRooms.name), asc(people.firstName));

  return rows.map((r) => ({
    visitId: r.visitId,
    personId: r.personId,
    name: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
    code: r.code,
    kind: r.kind,
    checkedInAt: r.checkedInAt,
    checkedOutAt: r.checkedOutAt,
    allergies: r.allergies,
    medicalNote: r.medicalNote,
  }));
}

export function canSupervise(role: TenantRole): boolean {
  return canCheckIn(role) || CAN_SUPERVISE.includes(role);
}

/** The board, refused to anybody who does not run check-in. */
export async function supervisorBoard(
  db: Tx,
  actor: { role: TenantRole },
  occurrenceId: string,
): Promise<Board> {
  if (!canSupervise(actor.role)) throw new PermissionError(actor.role, "checkIn");
  return roomBoard(db, occurrenceId);
}
