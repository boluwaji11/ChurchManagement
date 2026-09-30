import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { serviceOccurrences } from "../schema/gatherings";
import { serviceTimes } from "../schema/tenancy";
import { PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";

/**
 * R7.1. The church's calendar of gatherings.
 *
 * Generated from the weekly pattern in settings, then edited, because the
 * generated calendar is a starting point rather than the truth. Christmas Eve
 * is not in the pattern. The Sunday it snowed is in the pattern and did not
 * happen. Both have to be sayable, and a church that cannot say the second one
 * has a hole in its attendance record that looks like a collapse.
 */

/**
 * Staff plan services, so this is wider than the church settings that produced
 * the pattern. Cancelling a service is not renaming the church.
 */
export const CAN_MANAGE_SERVICES: readonly TenantRole[] = ["owner", "admin", "staff"];
export const canManageServices = (role: TenantRole): boolean =>
  CAN_MANAGE_SERVICES.includes(role);

export type OccurrenceStatus = "scheduled" | "cancelled";

export interface Occurrence {
  id: string;
  serviceTimeId: string | null;
  /** The repeat this came from, when it came from one. */
  frequency: string | null;
  name: string;
  occursOn: string;
  startsAt: string;
  status: OccurrenceStatus;
  note: string | null;
  countAdults: number | null;
  countChildren: number | null;
  countVisitors: number | null;
}

/**
 * The columns a write can hand back.
 *
 * `returning` can only name the table being written, and the frequency lives on
 * the series, so a write returns its id and the row is read back through
 * getOccurrence. Three infrequent operations pay one extra query rather than
 * every read carrying a shape that does not match the screen.
 */
const WRITTEN = { id: serviceOccurrences.id };

const COLUMNS = {
  id: serviceOccurrences.id,
  serviceTimeId: serviceOccurrences.serviceTimeId,
  frequency: serviceTimes.frequency,
  name: serviceOccurrences.name,
  occursOn: serviceOccurrences.occursOn,
  startsAt: serviceOccurrences.startsAt,
  status: serviceOccurrences.status,
  note: serviceOccurrences.note,
  countAdults: serviceOccurrences.countAdults,
  countChildren: serviceOccurrences.countChildren,
  countVisitors: serviceOccurrences.countVisitors,
};

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const PATTERN = {
  id: serviceTimes.id,
  name: serviceTimes.name,
  dayOfWeek: serviceTimes.dayOfWeek,
  startsAt: serviceTimes.startsAt,
  frequency: serviceTimes.frequency,
  anchorOn: serviceTimes.anchorOn,
  untilOn: serviceTimes.untilOn,
};

export const FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const isFrequency = (value: string): value is Frequency =>
  (FREQUENCIES as readonly string[]).includes(value);

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Which one of that weekday it is in its month. The 2nd Tuesday returns 2. */
const weekOfMonth = (d: Date) => Math.ceil(d.getDate() / 7);

const asRepeat = (row: {
  dayOfWeek: number; frequency: string; anchorOn: string | null; untilOn: string | null;
}): Repeat => ({
  dayOfWeek: row.dayOfWeek,
  frequency: isFrequency(row.frequency) ? row.frequency : "weekly",
  anchorOn: row.anchorOn,
  untilOn: row.untilOn,
});

export interface Repeat {
  dayOfWeek: number;
  frequency: Frequency;
  /** The first date, which fixes the pattern. */
  anchorOn: string | null;
  /** When it stops, or null to carry on. */
  untilOn: string | null;
}

/**
 * Every date in a range that this repeat lands on.
 *
 * Built from local dates rather than UTC instants, because "Sunday" is a local
 * idea and an offset slides it by a day either side of midnight.
 *
 * Monthly means the same weekday of the month, so the second Tuesday stays the
 * second Tuesday. A month with no fifth Sunday simply has none: moving it to
 * the fourth or the first of the next month would invent a service the church
 * did not say it holds.
 */
export function datesFor(from: string, to: string, repeat: Repeat): string[] {
  const out: string[] = [];
  const end = new Date(`${(repeat.untilOn && repeat.untilOn < to ? repeat.untilOn : to)}T00:00:00`);
  const anchor = repeat.anchorOn ? new Date(`${repeat.anchorOn}T00:00:00`) : null;
  const start = new Date(`${from}T00:00:00`);

  if (repeat.frequency === "monthly") {
    const nth = anchor ? weekOfMonth(anchor) : 1;
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const offset = (repeat.dayOfWeek - first.getDay() + 7) % 7;
      const day = new Date(cursor.getFullYear(), cursor.getMonth(), 1 + offset + (nth - 1) * 7);
      if (day.getMonth() === cursor.getMonth() && day >= start && day <= end) out.push(iso(day));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }

  const step = repeat.frequency === "fortnightly" ? 14 : 7;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + ((repeat.dayOfWeek - cursor.getDay() + 7) % 7));

  // Fortnightly counts from the first date, so the parity holds however far
  // into the future somebody looks.
  if (step === 14 && anchor) {
    const days = Math.round((cursor.getTime() - anchor.getTime()) / 86_400_000);
    if (((days / 7) % 2 + 2) % 2 !== 0) cursor.setDate(cursor.getDate() + 7);
  }

  while (cursor <= end) {
    if (cursor >= start) out.push(iso(cursor));
    cursor.setDate(cursor.getDate() + step);
  }
  return out;
}

export interface GenerateResult {
  created: number;
  /** Already there, so left exactly as they are. */
  kept: number;
}

/**
 * Fills the calendar from the weekly pattern, between two dates.
 *
 * Idempotent. An occurrence that already exists is left alone, including a
 * cancelled one and one somebody renamed, because regenerating a calendar must
 * never quietly undo a decision a person made about a particular week.
 */
export async function generateOccurrences(
  db: Tx,
  actor: WriteActor,
  range: { from: string; to: string },
): Promise<GenerateResult> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "manageServices");
  if (!isDate(range.from) || !isDate(range.to)) throw new InvalidInputError("service.error.range");
  if (range.to < range.from) throw new InvalidInputError("service.error.range");

  const pattern = await db.select(PATTERN).from(serviceTimes);

  if (pattern.length === 0) throw new InvalidInputError("service.error.noPattern");

  const rows = pattern.flatMap((service) =>
    datesFor(range.from, range.to, asRepeat(service)).map((occursOn) => ({
      tenantId: actor.tenantId,
      serviceTimeId: service.id,
      name: service.name,
      occursOn,
      startsAt: service.startsAt,
    })),
  );

  if (rows.length === 0) return { created: 0, kept: 0 };

  const written = await db
    .insert(serviceOccurrences)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: serviceOccurrences.id });

  return { created: written.length, kept: rows.length - written.length };
}

export interface ListOccurrences {
  from?: string;
  to?: string;
  includeCancelled?: boolean;
}

/** Newest first, which is how somebody looking for last Sunday reads it. */
export async function listOccurrences(db: Tx, opts: ListOccurrences = {}): Promise<Occurrence[]> {
  const where = [
    opts.from ? gte(serviceOccurrences.occursOn, opts.from) : undefined,
    opts.to ? lte(serviceOccurrences.occursOn, opts.to) : undefined,
    opts.includeCancelled ? undefined : eq(serviceOccurrences.status, "scheduled"),
  ].filter(Boolean);

  const rows = await db
    .select(COLUMNS)
    .from(serviceOccurrences)
    .leftJoin(serviceTimes, eq(serviceTimes.id, serviceOccurrences.serviceTimeId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(serviceOccurrences.occursOn), asc(serviceOccurrences.startsAt));

  return rows.map((r) => ({ ...r, status: r.status as OccurrenceStatus }));
}

export async function getOccurrence(db: Tx, id: string): Promise<Occurrence | null> {
  const [row] = await db
    .select(COLUMNS)
    .from(serviceOccurrences)
    .leftJoin(serviceTimes, eq(serviceTimes.id, serviceOccurrences.serviceTimeId))
    .where(eq(serviceOccurrences.id, id))
    .limit(1);
  return row ? { ...row, status: row.status as OccurrenceStatus } : null;
}

export interface SpecialServiceInput {
  name: string;
  occursOn: string;
  startsAt: string;
  note?: string | null;
}

/**
 * A gathering outside the weekly pattern: Christmas Eve, a funeral, a
 * Wednesday the youth group met in the hall.
 *
 * It carries no service time, so regenerating the calendar leaves it alone.
 */
export async function addSpecialService(
  db: Tx,
  actor: WriteActor,
  input: SpecialServiceInput,
): Promise<Occurrence> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "manageServices");

  const name = input.name.trim();
  if (!name) throw new InvalidInputError("service.error.name");
  if (!isDate(input.occursOn)) throw new InvalidInputError("service.error.date");
  if (!isTime(input.startsAt)) throw new InvalidInputError("service.error.time");

  const [row] = await db
    .insert(serviceOccurrences)
    .values({
      tenantId: actor.tenantId,
      serviceTimeId: null,
      name,
      occursOn: input.occursOn,
      startsAt: input.startsAt,
      note: input.note?.trim() || null,
    })
    .returning(WRITTEN);

  return (await getOccurrence(db, row!.id))!;
}

export interface OccurrenceEdit {
  name?: string;
  /** Moving a date is allowed. A church that shifted a service to the Saturday
   *  needs to say so, and the attendance recorded against it moves with it. */
  occursOn?: string;
  startsAt?: string;
  note?: string | null;
}

export async function updateOccurrence(
  db: Tx,
  actor: WriteActor,
  id: string,
  edit: OccurrenceEdit,
): Promise<Occurrence> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "manageServices");

  if (edit.name !== undefined && !edit.name.trim()) throw new InvalidInputError("service.error.name");
  if (edit.startsAt !== undefined && !isTime(edit.startsAt)) throw new InvalidInputError("service.error.time");
  if (edit.occursOn !== undefined && !isDate(edit.occursOn)) throw new InvalidInputError("service.error.date");

  const [row] = await db
    .update(serviceOccurrences)
    .set({
      ...(edit.name !== undefined ? { name: edit.name.trim() } : {}),
      ...(edit.occursOn !== undefined ? { occursOn: edit.occursOn } : {}),
      ...(edit.startsAt !== undefined ? { startsAt: edit.startsAt } : {}),
      ...(edit.note !== undefined ? { note: edit.note?.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(serviceOccurrences.id, id))
    .returning(WRITTEN);

  if (!row) throw new InvalidInputError("service.error.notFound");
  return (await getOccurrence(db, row.id))!;
}

/**
 * Cancels a gathering, or puts it back.
 *
 * The record stays either way. A cancelled Sunday that vanished from the
 * calendar leaves a gap that reads as a collapse in attendance, and somebody
 * has to remember, a year later, that it snowed.
 */
export async function setOccurrenceCancelled(
  db: Tx,
  actor: WriteActor,
  id: string,
  cancelled: boolean,
  note?: string,
): Promise<Occurrence> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "manageServices");

  const [row] = await db
    .update(serviceOccurrences)
    .set({
      status: cancelled ? "cancelled" : "scheduled",
      ...(note !== undefined ? { note: note.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(serviceOccurrences.id, id))
    .returning(WRITTEN);

  if (!row) throw new InvalidInputError("service.error.notFound");
  return (await getOccurrence(db, row.id))!;
}

/** Removes a one-off. A generated occurrence is cancelled rather than deleted. */
export async function removeSpecialService(
  db: Tx,
  actor: WriteActor,
  id: string,
): Promise<{ removed: number }> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "manageServices");

  const gone = await db
    .delete(serviceOccurrences)
    .where(and(eq(serviceOccurrences.id, id), sql`${serviceOccurrences.serviceTimeId} is null`))
    .returning({ id: serviceOccurrences.id });

  if (gone.length === 0) throw new InvalidInputError("service.error.notSpecial");
  return { removed: gone.length };
}

/** The gatherings a church is about to hold, for the attendance screens. */
export async function upcomingOccurrences(db: Tx, limit = 5): Promise<Occurrence[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select(COLUMNS)
    .from(serviceOccurrences)
    .leftJoin(serviceTimes, eq(serviceTimes.id, serviceOccurrences.serviceTimeId))
    .where(and(gte(serviceOccurrences.occursOn, today), eq(serviceOccurrences.status, "scheduled")))
    .orderBy(asc(serviceOccurrences.occursOn), asc(serviceOccurrences.startsAt))
    .limit(limit);

  return rows.map((r) => ({ ...r, status: r.status as OccurrenceStatus }));
}


/**
 * How far ahead a repeating service is written into the calendar.
 *
 * Six months is long enough that nobody meets the edge in normal use, and short
 * enough that a church changing its service time is not correcting two years of
 * rows. The calendar tops itself up whenever the page is opened, so the horizon
 * moves without anybody pressing anything.
 */
export const HORIZON_WEEKS = 26;

const today = () => new Date().toISOString().slice(0, 10);

const plusWeeks = (from: string, weeks: number): string => {
  const d = new Date(`${from}T00:00:00`);
  d.setDate(d.getDate() + weeks * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface AddServiceInput {
  name: string;
  occursOn: string;
  startsAt: string;
  /** Omitted for a one-off. */
  frequency?: Frequency;
  /** The last date it can fall on. Null or omitted means it carries on. */
  untilOn?: string | null;
}

/**
 * Adds a service, and keeps it coming if it repeats.
 *
 * One idea rather than three. A church that meets at 09:00 and 11:00 on a
 * Sunday adds two services once and never thinks about a calendar again. The
 * weekly pattern still exists underneath, because check-in stations and service
 * plans need to name a recurring service, and it is no longer something a
 * volunteer has to know about.
 */
export async function addService(
  db: Tx,
  actor: WriteActor,
  input: AddServiceInput,
): Promise<{ created: number; serviceTimeId: string | null }> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "manageServices");

  const name = input.name.trim();
  if (!name) throw new InvalidInputError("service.error.name");
  if (!isDate(input.occursOn)) throw new InvalidInputError("service.error.date");
  if (!isTime(input.startsAt)) throw new InvalidInputError("service.error.time");

  if (!input.frequency) {
    await addSpecialService(db, actor, input);
    return { created: 1, serviceTimeId: null };
  }
  if (!isFrequency(input.frequency)) throw new InvalidInputError("service.error.frequency");

  const untilOn = input.untilOn || null;
  if (untilOn && !isDate(untilOn)) throw new InvalidInputError("service.error.date");
  if (untilOn && untilOn < input.occursOn) throw new InvalidInputError("service.error.until");

  const dayOfWeek = new Date(`${input.occursOn}T00:00:00`).getDay();
  const repeat: Repeat = {
    dayOfWeek,
    frequency: input.frequency,
    anchorOn: input.occursOn,
    untilOn,
  };

  const [series] = await db
    .insert(serviceTimes)
    .values({
      tenantId: actor.tenantId, name, dayOfWeek, startsAt: input.startsAt,
      frequency: input.frequency, anchorOn: input.occursOn, untilOn,
    })
    .returning({ id: serviceTimes.id });

  // A monthly service needs a longer look ahead to reach the same number of
  // dates, so the horizon is measured in occurrences rather than in weeks.
  const horizon = input.frequency === "monthly" ? HORIZON_WEEKS * 4 : HORIZON_WEEKS;

  const rows = datesFor(input.occursOn, plusWeeks(input.occursOn, horizon), repeat).map(
    (occursOn) => ({
      tenantId: actor.tenantId,
      serviceTimeId: series!.id,
      name,
      occursOn,
      startsAt: input.startsAt,
    }),
  );

  const written = await db
    .insert(serviceOccurrences)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: serviceOccurrences.id });

  return { created: written.length, serviceTimeId: series!.id };
}

/**
 * Keeps the horizon moving, quietly.
 *
 * Called when the page is read, so the calendar is always full six months out
 * without a button that asks somebody to maintain it. Idempotent, and it does
 * nothing at all for a church with no repeating service.
 */
export async function topUpCalendar(db: Tx, actor: WriteActor): Promise<number> {
  const pattern = await db.select(PATTERN).from(serviceTimes);

  if (pattern.length === 0) return 0;

  const from = today();
  const to = plusWeeks(from, HORIZON_WEEKS);
  const rows = pattern.flatMap((service) =>
    datesFor(from, to, asRepeat(service)).map((occursOn) => ({
      tenantId: actor.tenantId,
      serviceTimeId: service.id,
      name: service.name,
      occursOn,
      startsAt: service.startsAt,
    })),
  );

  if (rows.length === 0) return 0;

  const written = await db
    .insert(serviceOccurrences)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: serviceOccurrences.id });

  return written.length;
}

/**
 * Stops a service repeating.
 *
 * Future dates go. Everything already held stays, because attendance was
 * recorded against it and a church deciding to stop meeting on a Wednesday has
 * not decided that the last two years of Wednesdays did not happen.
 */
export async function stopRepeating(
  db: Tx,
  actor: WriteActor,
  serviceTimeId: string,
): Promise<{ removed: number }> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "manageServices");

  const gone = await db
    .delete(serviceOccurrences)
    .where(and(
      eq(serviceOccurrences.serviceTimeId, serviceTimeId),
      gte(serviceOccurrences.occursOn, today()),
    ))
    .returning({ id: serviceOccurrences.id });

  await db.delete(serviceTimes).where(eq(serviceTimes.id, serviceTimeId));

  return { removed: gone.length };
}

export interface HeadcountInput {
  adults?: number | null;
  children?: number | null;
  visitors?: number | null;
  note?: string | null;
}

export interface Headcount {
  adults: number | null;
  children: number | null;
  visitors: number | null;
  total: number | null;
  note: string | null;
}

const count = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 0) throw new InvalidInputError("attendance.error.count");
  if (value > 100_000) throw new InvalidInputError("attendance.error.count");
  return value;
};

/**
 * R7.2. Headcount-only attendance.
 *
 * Most churches this size count heads on a clipboard and will never do more.
 * The product has to be better than the clipboard on the first Sunday, and it
 * must not nag anybody into naming individuals. Three numbers and a note is a
 * complete answer here, not a lesser one.
 *
 * A blank is different from a zero. Nobody counted is not the same as nobody
 * came, and a year of reports depends on the difference.
 */
export async function setHeadcount(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string,
  input: HeadcountInput,
): Promise<Headcount> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "recordAttendance");

  const [row] = await db
    .update(serviceOccurrences)
    .set({
      countAdults: count(input.adults),
      countChildren: count(input.children),
      countVisitors: count(input.visitors),
      ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(serviceOccurrences.id, occurrenceId))
    .returning({
      adults: serviceOccurrences.countAdults,
      children: serviceOccurrences.countChildren,
      visitors: serviceOccurrences.countVisitors,
      note: serviceOccurrences.note,
      status: serviceOccurrences.status,
    });

  if (!row) throw new InvalidInputError("service.error.notFound");
  if (row.status === "cancelled") throw new InvalidInputError("attendance.error.cancelled");

  return { ...row, total: totalOf(row) };
}

const totalOf = (row: { adults: number | null; children: number | null; visitors: number | null }) =>
  row.adults === null && row.children === null && row.visitors === null
    ? null
    : (row.adults ?? 0) + (row.children ?? 0) + (row.visitors ?? 0);

export interface CountedOccurrence extends Occurrence {
  total: number | null;
  counted: boolean;
}

/**
 * The services a church has held, with whatever was counted at each.
 *
 * Past first, because recording attendance is something done after the fact,
 * and the Sunday just gone is the one somebody is looking for.
 */
export async function listForAttendance(
  db: Tx,
  opts: { from?: string; to?: string; limit?: number } = {},
): Promise<CountedOccurrence[]> {
  const where = [
    eq(serviceOccurrences.status, "scheduled"),
    lte(serviceOccurrences.occursOn, opts.to ?? today()),
    opts.from ? gte(serviceOccurrences.occursOn, opts.from) : undefined,
  ].filter(Boolean);

  const rows = await db
    .select(COLUMNS)
    .from(serviceOccurrences)
    .leftJoin(serviceTimes, eq(serviceTimes.id, serviceOccurrences.serviceTimeId))
    .where(and(...where))
    .orderBy(desc(serviceOccurrences.occursOn), asc(serviceOccurrences.startsAt))
    .limit(opts.limit ?? 26);

  return rows.map((r) => {
    const total = totalOf({ adults: r.countAdults, children: r.countChildren, visitors: r.countVisitors });
    return { ...r, status: r.status as OccurrenceStatus, total, counted: total !== null };
  });
}
