/**
 * The age and room rules, with nothing behind them.
 *
 * A station with no network applies the same rules the server does, so they
 * live in a file that imports nothing and is served to the browser through
 * `@connectapp/db/rules`.
 */

/** What suggesting a room needs to know about one. The repo's Room satisfies it. */
export interface RoomShape {
  id: string;
  name: string;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  position: number;
  archivedAt: Date | null;
}

/**
 * How old somebody is, in whole months, on a given day.
 *
 * Whole months, because a room takes a child who is eleven months and
 * twenty-nine days old the same way it takes one who is eleven months and a
 * day. The day of the month is compared so a birthday partway through counts
 * only once it has passed.
 */
export function ageInMonths(dateOfBirth: string, asOf: string): number | null {
  const born = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf);
  if (!born || !day) return null;

  const [, by, bm, bd] = born.map(Number) as unknown as number[];
  const [, ay, am, ad] = day.map(Number) as unknown as number[];

  let months = (ay! - by!) * 12 + (am! - bm!);
  if (ad! < bd!) months -= 1;
  return months < 0 ? null : months;
}

/**
 * R8.14. Which room this child belongs in.
 *
 * A suggestion, and the station always lets a volunteer send them somewhere
 * else, because the child who is small for their age and sits with their
 * sibling is not a data error.
 *
 * The range is inclusive at the bottom and exclusive at the top, so a church
 * can write 0 to 24 and 24 to 48 without a month belonging to both rooms or to
 * neither. Where ranges do overlap, the narrowest room wins, which is what a
 * church means when it writes a nursery inside a wider toddler room.
 */
export function suggestRoom<T extends RoomShape>(rooms: T[], ageMonths: number | null): T | null {
  if (ageMonths === null) return null;

  const fits = rooms.filter(
    (r) =>
      r.archivedAt === null &&
      (r.minAgeMonths === null || ageMonths >= r.minAgeMonths) &&
      (r.maxAgeMonths === null || ageMonths < r.maxAgeMonths),
  );
  if (fits.length === 0) return null;

  const width = (r: T) =>
    r.minAgeMonths === null || r.maxAgeMonths === null
      ? Number.POSITIVE_INFINITY
      : r.maxAgeMonths - r.minAgeMonths;

  return fits.sort(
    (a, b) => width(a) - width(b) || a.position - b.position || a.name.localeCompare(b.name),
  )[0]!;
}

