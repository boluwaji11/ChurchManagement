import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { checkinVisits, checkinRooms, checkinCodes } from "../schema/checkin";
import { serviceOccurrences, attendanceRecords } from "../schema/gatherings";
import { people } from "../schema/people";
import { PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";
import { newCode, CODE_ATTEMPTS } from "./codes";

/**
 * R8.4, R8.5. Checking a family in.
 *
 * One press for the whole family, because a parent at the desk with three
 * children and a queue behind them is the case this has to serve. Each child
 * carries the room they were sent to, which is the room a volunteer can be
 * pointed at when somebody comes to collect them.
 *
 * Adults go through the same flow and take no room. They are checked in for
 * attendance and a name badge (R8.5).
 */

/** Running a station is the volunteer's job, so this is wider than managing one. */
export const CAN_CHECK_IN: readonly TenantRole[] = [
  "owner", "admin", "staff", "checkin_volunteer",
];
export const canCheckIn = (role: TenantRole): boolean => CAN_CHECK_IN.includes(role);

export interface CheckinEntry {
  personId: string;
  /** Null for an adult, or for a child the volunteer sent to no room. */
  roomId: string | null;
  /**
   * R8.21. A code from a station's reserved block, where the check-in happened
   * with no network. The online path leaves this unset and takes a fresh one.
   */
  code?: string | null;
  /** When it happened at the station, where that is not now. */
  at?: string | null;
  /**
   * R8.6. Whether this person needs a label pair and a code. A child does. An
   * adult takes a name badge, and a badge is not a claim on anybody.
   */
  child?: boolean;
}

export interface Visit {
  id: string;
  personId: string;
  name: string;
  /** "child", who is counted into a room, or "adult", who may be serving in it. */
  kind: string;
  roomId: string | null;
  roomName: string | null;
  roomHue: string | null;
  code: string | null;
  checkedInAt: Date;
  checkedOutAt: Date | null;
}

const COLUMNS = {
  id: checkinVisits.id,
  personId: checkinVisits.personId,
  roomId: checkinVisits.roomId,
  code: checkinVisits.code,
  kind: checkinVisits.kind,
  checkedInAt: checkinVisits.checkedInAt,
  checkedOutAt: checkinVisits.checkedOutAt,
};

/**
 * Checks a family in, and marks them present.
 *
 * The attendance record is the same one the roster writes, so a church reading
 * its attendance sees Sunday morning whether it was taken at a desk or ticked
 * off a list afterwards.
 *
 * Pressing twice is the same press: a person already checked in keeps the visit
 * they have, rather than taking a second one with a second code.
 */
export async function checkInFamily(
  db: Tx,
  actor: WriteActor,
  input: {
    occurrenceId: string;
    stationId?: string | null;
    /** The volunteer running the station, where one is signed in. */
    userId?: string | null;
    entries: CheckinEntry[];
  },
): Promise<Visit[]> {
  if (!canCheckIn(actor.role)) throw new PermissionError(actor.role, "checkIn");
  if (input.entries.length === 0) return [];

  const [occurrence] = await db
    .select({ id: serviceOccurrences.id, status: serviceOccurrences.status })
    .from(serviceOccurrences)
    .where(eq(serviceOccurrences.id, input.occurrenceId))
    .limit(1);
  if (!occurrence) throw new InvalidInputError("checkin.error.service");
  if (occurrence.status === "cancelled") throw new InvalidInputError("checkin.error.cancelled");

  // One at a time, because a child's code has to be unique for the church and
  // the only way to be sure of that with two stations running is to let the
  // database say no and ask again. A family is a handful of rows.
  for (const entry of input.entries) {
    await writeVisit(db, actor, input, entry);
  }

  await db
    .insert(attendanceRecords)
    .values(
      input.entries.map((entry) => ({
        tenantId: actor.tenantId,
        occurrenceId: input.occurrenceId,
        personId: entry.personId,
        source: "checkin",
      })),
    )
    .onConflictDoNothing();

  const ids = input.entries.map((e) => e.personId);
  return (await visitsFor(db, input.occurrenceId)).filter((v) => ids.includes(v.personId));
}

/**
 * One visit, with a code where the person is a child.
 *
 * A candidate code is checked against the church's own before it is used, and
 * the unique index is the backstop. The index cannot be the first line here:
 * this runs inside one transaction for the whole family, and a statement
 * Postgres refuses aborts that transaction rather than handing back something
 * to retry. So a collision that got past the check fails the check-in, loudly,
 * and the volunteer presses again. A refused check-in is a queue waiting ten
 * seconds. A silent one is a child with no label.
 */
async function writeVisit(
  db: Tx,
  actor: WriteActor,
  input: { occurrenceId: string; stationId?: string | null; userId?: string | null },
  entry: CheckinEntry,
): Promise<void> {
  const row = {
    tenantId: actor.tenantId,
    occurrenceId: input.occurrenceId,
    personId: entry.personId,
    roomId: entry.roomId,
    stationId: input.stationId ?? null,
    checkedInBy: input.userId ?? null,
  };

  const child = entry.child !== false;
  const code = child ? (entry.code ?? (await freeCode(db))) : null;

  await db
    .insert(checkinVisits)
    .values({
      ...row,
      code,
      kind: child ? "child" : "adult",
      ...(entry.at ? { checkedInAt: new Date(entry.at) } : {}),
    })
    .onConflictDoNothing({ target: [checkinVisits.occurrenceId, checkinVisits.personId] });
}

/**
 * A code this church has not issued before and has not promised to a station.
 *
 * The reserved blocks matter here. A station holding a hundred codes for a
 * service it has not run yet has those codes on no label, so nothing stops this
 * from picking one by chance, and then two children have the same code.
 */
async function freeCode(db: Tx): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const candidate = newCode();
    const [taken] = await db
      .select({ id: checkinVisits.id })
      .from(checkinVisits)
      .where(eq(checkinVisits.code, candidate))
      .limit(1);
    if (taken) continue;

    const [promised] = await db
      .select({ id: checkinCodes.id })
      .from(checkinCodes)
      .where(eq(checkinCodes.code, candidate))
      .limit(1);
    if (!promised) return candidate;
  }
  throw new InvalidInputError("checkin.error.code");
}

/** Everybody checked in to one service, with the room they went to. */
export async function visitsFor(db: Tx, occurrenceId: string): Promise<Visit[]> {
  const rows = await db
    .select({
      ...COLUMNS,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      roomName: checkinRooms.name,
      roomHue: checkinRooms.hue,
    })
    .from(checkinVisits)
    .innerJoin(people, eq(people.id, checkinVisits.personId))
    .leftJoin(checkinRooms, eq(checkinRooms.id, checkinVisits.roomId))
    .where(eq(checkinVisits.occurrenceId, occurrenceId))
    .orderBy(asc(checkinVisits.checkedInAt));

  return rows.map((r) => ({
    id: r.id,
    personId: r.personId,
    name: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
    kind: r.kind,
    roomId: r.roomId,
    roomName: r.roomName,
    roomHue: r.roomHue,
    code: r.code,
    checkedInAt: r.checkedInAt,
    checkedOutAt: r.checkedOutAt,
  }));
}

/** Which of these people are already checked in, so the desk does not ask twice. */
export async function visitsForPeople(
  db: Tx,
  occurrenceId: string,
  personIds: string[],
): Promise<Visit[]> {
  if (personIds.length === 0) return [];
  const all = await visitsFor(db, occurrenceId);
  return all.filter((v) => personIds.includes(v.personId));
}

/**
 * Undoing a check-in.
 *
 * A volunteer who checks in the wrong child needs that gone in one press, and
 * the attendance mark goes with it. A child who has already been collected is
 * not undone: that is a checkout, and it is a record of what happened.
 */
export async function undoCheckIn(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string,
  personId: string,
): Promise<void> {
  if (!canCheckIn(actor.role)) throw new PermissionError(actor.role, "checkIn");

  const removed = await db
    .delete(checkinVisits)
    .where(
      and(
        eq(checkinVisits.occurrenceId, occurrenceId),
        eq(checkinVisits.personId, personId),
        isNull(checkinVisits.checkedOutAt),
      ),
    )
    .returning({ id: checkinVisits.id });

  if (removed.length === 0) throw new InvalidInputError("checkin.error.collected");

  await db
    .delete(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.occurrenceId, occurrenceId),
        eq(attendanceRecords.personId, personId),
        eq(attendanceRecords.source, "checkin"),
      ),
    );
}

/** How full each room is right now, for the capacity rules the station applies. */
export async function roomCounts(
  db: Tx,
  occurrenceId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ roomId: checkinVisits.roomId, n: sql<string>`count(*)` })
    .from(checkinVisits)
    .where(
      and(
        eq(checkinVisits.occurrenceId, occurrenceId),
        isNull(checkinVisits.checkedOutAt),
        eq(checkinVisits.kind, "child"),
      ),
    )
    .groupBy(checkinVisits.roomId);

  const out: Record<string, number> = {};
  for (const row of rows) if (row.roomId) out[row.roomId] = Number(row.n);
  return out;
}

/**
 * R8.11. What goes on the two labels.
 *
 * The child's label carries everything a volunteer in the room needs without
 * asking anybody: who this is, where they belong, which service, and the code.
 * The guardian's carries the child's name, the room, and the same code, because
 * a parent coming back at 10:45 needs to know which door to stand at and what
 * to say when they get there.
 *
 * Built here rather than in the browser so that a station printing offline
 * prints the same labels as one printing online.
 */
export interface LabelPair {
  personId: string;
  childName: string;
  roomName: string | null;
  roomHue: string | null;
  serviceName: string;
  churchName: string;
  /**
   * R8.6. The code the pair is matched on. Null for an adult, who takes a name
   * badge: a badge says who somebody is and makes no claim on a child.
   */
  code: string | null;
  /** R8.10. What the room has to know. Null means nothing is recorded. */
  allergy: string | null;
}

export async function labelsFor(
  db: Tx,
  occurrenceId: string,
  personIds: string[],
  churchName: string,
): Promise<LabelPair[]> {
  if (personIds.length === 0) return [];

  const rows = await db
    .select({
      personId: checkinVisits.personId,
      code: checkinVisits.code,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      allergies: people.allergies,
      roomName: checkinRooms.name,
      roomHue: checkinRooms.hue,
      serviceName: serviceOccurrences.name,
    })
    .from(checkinVisits)
    .innerJoin(people, eq(people.id, checkinVisits.personId))
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, checkinVisits.occurrenceId))
    .leftJoin(checkinRooms, eq(checkinRooms.id, checkinVisits.roomId))
    .where(eq(checkinVisits.occurrenceId, occurrenceId))
    .orderBy(asc(people.firstName));

  // Everybody checked in has something to wear. A child gets the pair, matched
  // on a code; an adult gets a name badge, which the sheet prints as one label
  // with no code on it. (R8.5, R8.6)
  return rows
    .filter((r) => personIds.includes(r.personId))
    .map((r) => ({
      personId: r.personId,
      childName: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
      roomName: r.roomName,
      roomHue: r.roomHue,
      serviceName: r.serviceName,
      churchName,
      code: r.code,
      allergy: r.allergies,
    }));
}
