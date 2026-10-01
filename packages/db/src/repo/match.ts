/**
 * R8.20. The lookup rules, with no database behind them.
 *
 * A station with no network searches the copy of the directory it pulled down
 * before the service, and it has to find the same people in the same order as
 * the server would. So the rules are written once, here, in a file that imports
 * nothing: the SQL in `lookup.ts` is this file's shape expressed in a query, and
 * a test holds the two together.
 */

export interface Matchable {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  /** The household they live in, which people also search by. */
  householdName: string | null;
  /** Digits only. The last four are what a parent reads off the top of their head. */
  phones: string[];
}

/** Four or more digits is a phone number rather than a name. */
export const PHONE_DIGITS = 4;

/** Fewer than this and the answer is every person in the church. */
export const MIN_QUERY = 2;

const digits = (raw: string): string => raw.replace(/\D+/g, "");

/**
 * How well somebody matches, lower being better, or null for no match.
 *
 * The order is the order of confidence: the name they go by, their surname,
 * their full name as it is said, then the household they live in.
 */
export function rank(query: string, person: Matchable): number | null {
  const text = query.trim().toLowerCase();
  if (text.length < MIN_QUERY) return null;

  const numeric = digits(text);
  if (numeric.length >= PHONE_DIGITS) {
    return person.phones.some((phone) => digits(phone).endsWith(numeric)) ? 0 : null;
  }

  const first = person.firstName.toLowerCase();
  const called = (person.preferredName?.trim() || person.firstName).toLowerCase();
  const last = person.lastName.toLowerCase();
  const household = (person.householdName ?? "").toLowerCase();

  if (called.startsWith(text)) return 0;
  if (first.startsWith(text)) return 0;
  if (last.startsWith(text)) return 1;
  if (`${first} ${last}`.startsWith(text)) return 2;
  if (household.startsWith(text)) return 3;
  return null;
}

/** The people a station shows for what was typed, best first. */
export function search<T extends Matchable>(people: T[], query: string, limit = 20): T[] {
  const scored: { person: T; rank: number }[] = [];

  for (const person of people) {
    const score = rank(query, person);
    if (score !== null) scored.push({ person, rank: score });
  }

  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.person.lastName.localeCompare(b.person.lastName) ||
      (a.person.preferredName?.trim() || a.person.firstName).localeCompare(
        b.person.preferredName?.trim() || b.person.firstName,
      ),
  );

  return scored.slice(0, limit).map((s) => s.person);
}
