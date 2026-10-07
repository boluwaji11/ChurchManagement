import type { Repeat } from "./repeats";

/**
 * R13.3. When a repeating gift first comes out.
 *
 * Stripe anchors a subscription to its first collection and will not take one
 * more than a single interval ahead, so a weekly gift starts inside the next
 * seven days and a monthly one inside the next month. That is the whole
 * constraint, and the two controls on the form live inside it: pick the day
 * and the date follows, or pick the date and the day follows.
 */

const DAY = 86_400_000;

/** Today where the giver is standing, as a plain date. */
export function today(): string {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

function iso(year: number, month: number, day: number): string {
  const at = new Date(year, month, day);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(
    at.getDate(),
  ).padStart(2, "0")}`;
}

function read(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** The furthest ahead Stripe will take a first collection. */
export function furthest(repeat: Exclude<Repeat, "once">): string {
  const from = read(today());
  if (repeat === "week") return isoFrom(new Date(from.getTime() + 7 * DAY));
  if (repeat === "fortnight") return isoFrom(new Date(from.getTime() + 14 * DAY));
  if (repeat === "year") return iso(from.getFullYear() + 1, from.getMonth(), from.getDate());
  return iso(from.getFullYear(), from.getMonth() + 1, from.getDate());
}

const isoFrom = (at: Date) => iso(at.getFullYear(), at.getMonth(), at.getDate());

/** The next time this weekday comes round, counting today. */
export function onWeekday(weekday: number): string {
  const from = read(today());
  const ahead = (weekday - from.getDay() + 7) % 7;
  return isoFrom(new Date(from.getTime() + ahead * DAY));
}

/** The next time this day of the month comes round, counting today. */
export function onMonthDay(day: number): string {
  const from = read(today());
  return from.getDate() <= day
    ? iso(from.getFullYear(), from.getMonth(), day)
    : iso(from.getFullYear(), from.getMonth() + 1, day);
}

/** Which weekday a date falls on. */
export const weekdayOf = (value: string): number => read(value).getDay();

/** Which day of the month a date falls on. */
export const monthDayOf = (value: string): number => read(value).getDate();

/** The weekday names, in the reader's own language, starting on Sunday. */
export function weekdays(): string[] {
  // Read in UTC, because the dates below are built in UTC: west of Greenwich
  // a local reading lands on the day before and the whole list slides by one.
  const names = new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" });
  // 4 January 1970 was a Sunday, which is where the week starts here.
  return [0, 1, 2, 3, 4, 5, 6].map((at) => names.format(new Date(Date.UTC(1970, 0, 4 + at))));
}
