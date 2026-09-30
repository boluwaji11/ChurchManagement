import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { people, households, householdMemberships, contactMethods } from "../schema/people";
import { ageInMonths } from "./rooms";

/**
 * R8.3, R8.4. Finding a family at the station.
 *
 * The design case is 09:58 with forty families queuing, so this answers the two
 * ways a parent identifies themselves without thinking: the last four digits of
 * their phone number, and a name. Both return the whole household, because a
 * parent at the desk is checking in their children rather than themselves, and
 * asking for each child by name in turn is how a queue stops moving.
 */

/** Old enough that the station offers a name badge rather than a room. */
export const CHILD_UNDER_YEARS = 18;

export interface LookupPerson {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  /** What to call them: their preferred name where they have one. */
  name: string;
  dateOfBirth: string | null;
  /** Null where the church has no date of birth, which is common for adults. */
  ageMonths: number | null;
  householdRole: string;
  /** Under eighteen, or recorded as a child of this household. */
  isChild: boolean;
}

export interface HouseholdMatch {
  /** Null for somebody the church holds outside any household. */
  householdId: string | null;
  name: string;
  people: LookupPerson[];
}

/** Digits only, so "(512) 555-0134" and "512-555-0134" answer the same question. */
const digits = (raw: string): string => raw.replace(/\D+/g, "");

const called = (row: { firstName: string; preferredName: string | null }) =>
  row.preferredName?.trim() || row.firstName;

/**
 * Households matching what somebody typed.
 *
 * Four or more digits searches phone numbers by their ending, which is what a
 * parent reads off the top of their head. Anything else searches names, of
 * people and of households, from the start of any word, so "mia och" finds the
 * Ochoas and "ochoa" does too.
 */
export async function lookupHouseholds(
  db: Tx,
  query: string,
  opts: { asOf: string; limit?: number } = { asOf: new Date().toISOString().slice(0, 10) },
): Promise<HouseholdMatch[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  const limit = opts.limit ?? 12;
  const numeric = digits(text);
  const byPhone = numeric.length >= 4;

  // The people who match, then everybody who lives with them. A parent typing
  // their own number expects their children, and the children are what the
  // station is for.
  const seeds = byPhone
    ? sql`
        select distinct c.person_id
          from contact_methods c
         where c.kind = 'phone'
           and regexp_replace(c.value, '\\D', '', 'g') like ${"%" + numeric}`
    : sql`
        select p.id as person_id
          from people p
          left join household_memberships hm
            on hm.person_id = p.id and hm.ended_on is null
          left join households h on h.id = hm.household_id
         where p.archived_at is null
           and (
             unaccent_lower(p.first_name) like ${sql.raw("$$")}
             or unaccent_lower(coalesce(p.preferred_name, '')) like ${sql.raw("$$")}
             or unaccent_lower(p.last_name) like ${sql.raw("$$")}
             or unaccent_lower(coalesce(h.name, '')) like ${sql.raw("$$")}
           )`;

  const rows = await db.execute(sql`
    with seed as (${seeds}),
    household_ids as (
      select distinct hm.household_id
        from household_memberships hm
        join seed on seed.person_id = hm.person_id
       where hm.ended_on is null
    )
    select p.id, p.first_name, p.last_name, p.preferred_name,
           p.date_of_birth::text as date_of_birth,
           hm.household_id, h.name as household_name, hm.role
      from people p
      left join household_memberships hm
        on hm.person_id = p.id and hm.ended_on is null
      left join households h on h.id = hm.household_id
     where p.archived_at is null
       and (
         hm.household_id in (select household_id from household_ids)
         or (hm.household_id is null and p.id in (select person_id from seed))
       )
     order by h.name nulls last, p.last_name, p.first_name
  `);

  return group(rows as unknown as Record<string, unknown>[], opts.asOf, limit);
}

function group(
  rows: Record<string, unknown>[],
  asOf: string,
  limit: number,
): HouseholdMatch[] {
  const out = new Map<string, HouseholdMatch>();

  for (const row of rows) {
    const householdId = (row["household_id"] as string | null) ?? null;
    const person: LookupPerson = {
      id: String(row["id"]),
      firstName: String(row["first_name"]),
      lastName: String(row["last_name"]),
      preferredName: (row["preferred_name"] as string | null) ?? null,
      name: called({
        firstName: String(row["first_name"]),
        preferredName: (row["preferred_name"] as string | null) ?? null,
      }),
      dateOfBirth: (row["date_of_birth"] as string | null) ?? null,
      ageMonths: null,
      householdRole: String(row["role"] ?? "other"),
      isChild: false,
    };

    person.ageMonths = person.dateOfBirth ? ageInMonths(person.dateOfBirth, asOf) : null;
    person.isChild =
      person.ageMonths !== null
        ? person.ageMonths < CHILD_UNDER_YEARS * 12
        : person.householdRole === "child";

    const key = householdId ?? `person:${person.id}`;
    const existing = out.get(key);
    if (existing) {
      existing.people.push(person);
      continue;
    }
    out.set(key, {
      householdId,
      name: (row["household_name"] as string | null) ?? `${person.lastName}, ${person.name}`,
      people: [person],
    });
  }

  // Children first inside a household, because they are what the queue is for.
  for (const match of out.values()) {
    match.people.sort(
      (a, b) =>
        Number(b.isChild) - Number(a.isChild) ||
        (a.ageMonths ?? Number.MAX_SAFE_INTEGER) - (b.ageMonths ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name),
    );
  }

  return [...out.values()].slice(0, limit);
}
