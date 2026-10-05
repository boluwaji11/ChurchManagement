/**
 * R9.2, R9.5. When a group meets next.
 *
 * Worked out from the pattern rather than stored, because a church that has to
 * create fifty-two rows to say "Tuesdays" will stop saying it. The dates it
 * produces are what a member reads on the group's page: the next few Tuesdays,
 * and nothing anybody has to maintain.
 *
 * Pure, with no database and no imports, so the browser and the server agree.
 */

export type MeetingFrequency = "daily" | "weekly" | "fortnightly" | "monthly";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * The next dates this group meets, starting from `from` inclusive.
 *
 * A monthly group is taken to meet on the same weekday in the same week of the
 * month, because "the first Tuesday" is how a church says monthly and "every
 * 30 days" is not.
 */
export function upcomingMeetings(
  pattern: {
    dayOfWeek: number | null;
    frequency: string | null;
    /** R9.2. The day it stops meeting, where it has one. */
    endsOn?: string | null;
  },
  from: string,
  count = 3,
): string[] {
  if (!DATE.test(from) || count < 1) return [];
  // A daily group has no weekday, and every other pattern needs one.
  const daily = pattern.frequency === "daily";
  if (pattern.dayOfWeek === null && !daily) return [];

  const [y, m, d] = from.split("-").map(Number) as [number, number, number];
  const start = new Date(Date.UTC(y, m - 1, d));

  const first = new Date(start);
  if (!daily) {
    const ahead = ((pattern.dayOfWeek ?? 0) - start.getUTCDay() + 7) % 7;
    first.setUTCDate(first.getUTCDate() + ahead);
  }

  const step = daily
    ? 1
    : pattern.frequency === "fortnightly"
      ? 14
      : pattern.frequency === "monthly"
        ? 28
        : 7;

  const until = pattern.endsOn && DATE.test(pattern.endsOn) ? pattern.endsOn : null;

  const out: string[] = [];
  const cursor = new Date(first);
  for (let n = 0; n < count; n += 1) {
    const day = iso(cursor);
    if (until && day > until) break;
    out.push(day);
    cursor.setUTCDate(cursor.getUTCDate() + step);
  }
  return out;
}

/** "Meets weekly on Tuesdays, 7:30pm to 9:00pm", as a church would say it. */
export function meetingSentence(
  pattern: {
    dayOfWeek: number | null;
    frequency: string | null;
    startsAt: string | null;
    endsAt: string | null;
  },
  words: {
    /** "Tuesday", from the reader's own locale. */
    day: (dayOfWeek: number) => string;
    /** "7:30pm", from the reader's own locale. */
    time: (hhmm: string) => string;
    /** "daily", "weekly", "fortnightly", "monthly". */
    frequency: (key: string) => string;
    /** The sentence, with {frequency}, {day}, {from} and {to} filled in. */
    template: (parts: { frequency: string; day: string; span: string }) => string;
  },
): string {
  if (pattern.dayOfWeek === null && pattern.frequency !== "daily") return "";

  const span = pattern.startsAt
    ? pattern.endsAt
      ? `${words.time(pattern.startsAt)} to ${words.time(pattern.endsAt)}`
      : words.time(pattern.startsAt)
    : "";

  return words.template({
    frequency: words.frequency(pattern.frequency ?? "weekly"),
    day: pattern.dayOfWeek === null ? "" : words.day(pattern.dayOfWeek),
    span,
  });
}
