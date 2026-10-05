import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { milestones, people, relationships } from "../schema/people";

/**
 * R2.11. Birthdays and anniversaries, for a month or for a week.
 *
 * The question behind this screen is a card, a phone call or a line in the
 * notices, and it is always asked about a window: who has a birthday in
 * October, who has one this week. So the window is the argument, and a
 * recurring day is matched on its month and day rather than on its date.
 *
 * Two windows, because churches ask in two sizes. A month for the notices that
 * go out once, a week for the ones read out at a service.
 *
 * The admin list ignores the directory preferences in R3.2. Those govern what
 * the congregation is shown about somebody. A church holding a birthday it was
 * given still gets to send the card.
 */

export type CelebrationKind = "birthday" | "anniversary";

/** Inclusive at both ends, and never longer than a year. */
export interface CelebrationWindow {
  from: string;
  to: string;
}

export interface Celebration {
  kind: CelebrationKind;
  personId: string;
  name: string;
  /** The day it falls on inside this window. */
  on: string;
  /** The age they reach, or the years married. Null when the year is unknown. */
  years: number | null;
  /** The spouse, on an anniversary the church holds for both of them. */
  partnerId: string | null;
  partnerName: string | null;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number): string => String(n).padStart(2, "0");
const isLeap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** The whole of one month. */
export function monthWindow(year: number, month: number): CelebrationWindow {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}

/**
 * Seven days from the day given.
 *
 * The week starts on the day somebody asked about, so there is no setting for
 * which day a week begins on and no screen that disagrees with the church
 * about it.
 */
export function weekWindow(start: string): CelebrationWindow {
  const at = new Date(`${start}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 6);
  return { from: start, to: at.toISOString().slice(0, 10) };
}

/**
 * Which year an anniversary of this month and day falls in, inside the window.
 *
 * A week crossing new year holds two years at once, and a birthday on 2
 * January belongs to the later one.
 */
function occurrenceIn(window: CelebrationWindow, monthDay: string): string {
  const fromMd = window.from.slice(5);
  const toMd = window.to.slice(5);
  const wraps = fromMd > toMd;
  const year = Number(
    wraps && monthDay < fromMd ? window.to.slice(0, 4) : window.from.slice(0, 4),
  );

  // 29 February in a year that does not have one. It is held on the 28th, so a
  // church looking at February finds it in February.
  if (monthDay === "02-29" && !isLeap(year)) return `${year}-02-28`;
  return `${year}-${monthDay}`;
}

/** The month and day predicate for a window, wrapping across new year. */
function withinWindow(column: ReturnType<typeof sql>, window: CelebrationWindow) {
  const fromMd = window.from.slice(5);
  const toMd = window.to.slice(5);
  const md = sql`to_char(${column}, 'MM-DD')`;
  const inside = fromMd <= toMd
    ? and(sql`${md} >= ${fromMd}`, sql`${md} <= ${toMd}`)
    : or(sql`${md} >= ${fromMd}`, sql`${md} <= ${toMd}`);

  // A window ending on 28 February of a year with no 29th has to reach the
  // people born on the 29th, or they appear on no list for three years out of
  // four.
  const feb28 = occurrenceIn(window, "02-28");
  const holdsLeapDay =
    feb28 >= window.from && feb28 <= window.to && !isLeap(Number(feb28.slice(0, 4)));

  return holdsLeapDay ? or(inside, sql`${md} = '02-29'`) : inside;
}

const displayName = (r: { firstName: string; preferredName: string | null; lastName: string }) =>
  `${r.preferredName ?? r.firstName} ${r.lastName}`;

/** Everybody whose birthday falls in the window. */
async function birthdays(db: Tx, window: CelebrationWindow): Promise<Celebration[]> {
  const rows = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      preferredName: people.preferredName,
      lastName: people.lastName,
      born: sql<string>`${people.dateOfBirth}::text`,
    })
    .from(people)
    .where(and(
      isNotNull(people.dateOfBirth),
      // R2.13. Archived people leave every list.
      isNull(people.archivedAt),
      // A church does not send a birthday card to somebody who has died.
      ne(people.lifecycleStatus, "deceased"),
      withinWindow(sql`${people.dateOfBirth}`, window),
    ));

  return rows.map((r) => {
    const on = occurrenceIn(window, r.born.slice(5));
    return {
      kind: "birthday" as const,
      personId: r.id,
      name: displayName(r),
      on,
      years: Number(on.slice(0, 4)) - Number(r.born.slice(0, 4)),
      partnerId: null,
      partnerName: null,
    };
  });
}

/**
 * Wedding anniversaries, from the marriage milestone.
 *
 * Both spouses carry the milestone where the church recorded it twice, and one
 * anniversary belongs to a couple. So where two people are married to each
 * other and hold the same date, they appear once, together.
 */
async function anniversaries(db: Tx, window: CelebrationWindow): Promise<Celebration[]> {
  const rows = await db
    .select({
      personId: milestones.personId,
      firstName: people.firstName,
      preferredName: people.preferredName,
      lastName: people.lastName,
      occurredOn: sql<string>`${milestones.occurredOn}::text`,
    })
    .from(milestones)
    .innerJoin(people, eq(people.id, milestones.personId))
    .where(and(
      eq(milestones.kind, "marriage"),
      isNull(people.archivedAt),
      ne(people.lifecycleStatus, "deceased"),
      withinWindow(sql`${milestones.occurredOn}`, window),
    ));

  if (rows.length === 0) return [];

  const spouses = await db
    .select({ personId: relationships.personId, relatedPersonId: relationships.relatedPersonId })
    .from(relationships)
    .where(eq(relationships.kind, "spouse"));

  const married = new Map<string, Set<string>>();
  for (const s of spouses) {
    for (const [a, b] of [[s.personId, s.relatedPersonId], [s.relatedPersonId, s.personId]]) {
      const set = married.get(a!) ?? new Set<string>();
      set.add(b!);
      married.set(a!, set);
    }
  }

  const byPerson = new Map(rows.map((r) => [`${r.personId}:${r.occurredOn}`, r]));
  const paired = new Set<string>();
  const out: Celebration[] = [];

  for (const r of rows) {
    const key = `${r.personId}:${r.occurredOn}`;
    if (paired.has(key)) continue;

    const spouse = [...(married.get(r.personId) ?? [])]
      .map((id) => byPerson.get(`${id}:${r.occurredOn}`))
      .find((m) => m !== undefined);

    if (spouse) paired.add(`${spouse.personId}:${r.occurredOn}`);

    const on = occurrenceIn(window, r.occurredOn.slice(5));
    out.push({
      kind: "anniversary",
      personId: r.personId,
      name: displayName(r),
      on,
      years: Number(on.slice(0, 4)) - Number(r.occurredOn.slice(0, 4)),
      partnerId: spouse?.personId ?? null,
      partnerName: spouse ? displayName(spouse) : null,
    });
  }

  return out;
}

/**
 * R2.11. Every birthday and anniversary in the window, in the order a church
 * reads them out: by the day they fall on, then by name.
 */
export async function listCelebrations(
  db: Tx,
  window: CelebrationWindow,
): Promise<Celebration[]> {
  if (!ISO.test(window.from) || !ISO.test(window.to)) return [];

  const [b, a] = await Promise.all([birthdays(db, window), anniversaries(db, window)]);

  return [...b, ...a].sort(
    (x, y) =>
      x.on.localeCompare(y.on) ||
      x.kind.localeCompare(y.kind) ||
      x.name.localeCompare(y.name),
  );
}
