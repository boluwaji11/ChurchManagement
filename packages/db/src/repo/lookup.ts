import { sql } from "drizzle-orm";
import type { Tx } from "../client";
import { ageInMonths } from "./rooms";

/**
 * R8.3, R8.4. Finding somebody at the station.
 *
 * The design case is 09:58 with forty families queuing, so this answers the two
 * ways a person identifies themselves without thinking: the last four digits of
 * their phone number, and a name.
 *
 * What comes back is the directory: one row per person who matched, the way the
 * typist thinks of them. A parent checking three children in is still one press,
 * because each row carries the household behind it, so the desk opens a person
 * and gets their family already on screen.
 *
 * Matching is on the start of a name rather than anywhere inside it. Typing
 * "ann" at a desk means Annette, and surfacing Rosanna and Giovanni alongside
 * her is a list somebody has to read instead of a list somebody can point at.
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
  /** R8.10. What a room has to know. Null means nothing is recorded. */
  allergies: string | null;
  medicalNote: string | null;
}

export interface PersonMatch {
  /** The person who matched what was typed. */
  person: LookupPerson;
  /** Null for somebody the church holds outside any household. */
  householdId: string | null;
  /** The household's name, for the quiet second line under a row. */
  householdName: string | null;
  /** Everybody who lives with them, children first, including the match. */
  household: LookupPerson[];
}

/** Digits only, so "(512) 555-0134" and "512-555-0134" answer the same question. */
const digits = (raw: string): string => raw.replace(/\D+/g, "");

const called = (row: { firstName: string; preferredName: string | null }) =>
  row.preferredName?.trim() || row.firstName;

/** LIKE treats these as wildcards, and a surname can contain either. */
const escapeLike = (raw: string): string => raw.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * People matching what somebody typed, best match first.
 *
 * Four or more digits searches phone numbers by their ending, which is what a
 * parent reads off the top of their head. Anything else searches the start of a
 * first name, a preferred name, a surname, a full name as it is said, or a
 * household name, in that order of confidence.
 */
export async function lookupPeople(
  db: Tx,
  query: string,
  opts: { asOf: string; limit?: number },
): Promise<PersonMatch[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  const limit = opts.limit ?? 20;
  const numeric = digits(text);
  const prefix = `${escapeLike(text.toLowerCase())}%`;

  // Four or more digits is a phone number, and the ending is what members
  // remember, so that one is matched from the right.
  const matched =
    numeric.length >= 4
      ? sql`
          select distinct c.member_id as id, 0 as rank
            from contact_methods c
           where c.kind = 'phone'
             and regexp_replace(c.value, '[^0-9]', '', 'g') like ${"%" + numeric}`
      : sql`
          select p.id as id,
                 min(case
                   when lower(coalesce(nullif(p.preferred_name, ''), p.first_name)) like ${prefix} then 0
                   when lower(p.last_name) like ${prefix} then 1
                   when lower(p.first_name || ' ' || p.last_name) like ${prefix} then 2
                   else 3
                 end) as rank
            from members p
            left join household_memberships hm
              on hm.member_id = p.id and hm.ended_on is null
            left join households h on h.id = hm.household_id
           where p.archived_at is null
             and (
               lower(p.first_name) like ${prefix}
               or lower(coalesce(p.preferred_name, '')) like ${prefix}
               or lower(p.last_name) like ${prefix}
               or lower(p.first_name || ' ' || p.last_name) like ${prefix}
               or lower(coalesce(h.name, '')) like ${prefix}
             )
           group by p.id`;

  // One pass: the members who matched, then everybody who lives with them. The
  // second half is what makes checking a family in a single press, and it costs
  // nothing extra at the desk.
  const rows = await db.execute(sql`
    with matched as (${matched}),
    seed as (
      select m.id as id, m.rank as rank,
             hm.household_id as household_id, h.name as household_name,
             p.last_name as last_name, p.first_name as first_name
        from matched m
        join members p on p.id = m.id and p.archived_at is null
        left join household_memberships hm
          on hm.member_id = m.id and hm.ended_on is null
        left join households h on h.id = hm.household_id
       order by m.rank, p.last_name, p.first_name
       limit ${limit}
    )
    select s.id as seed_id, s.rank as rank,
           s.household_id as household_id, s.household_name as household_name,
           p.id as member_id, p.first_name, p.last_name, p.preferred_name,
           p.date_of_birth::text as date_of_birth,
           p.allergies, p.medical_note, coalesce(hm.role, 'other') as role
      from seed s
      join household_memberships hm
        on hm.household_id = s.household_id and hm.ended_on is null
      join members p on p.id = hm.member_id and p.archived_at is null
    union all
    select s.id, s.rank, null::uuid, null::text,
           p.id, p.first_name, p.last_name, p.preferred_name,
           p.date_of_birth::text, p.allergies, p.medical_note, 'other'
      from seed s
      join members p on p.id = s.id
     where s.household_id is null
  `);

  return assemble(rows as unknown as Record<string, unknown>[], opts.asOf);
}

function person(row: Record<string, unknown>, asOf: string): LookupPerson {
  const firstName = String(row["first_name"]);
  const preferredName = (row["preferred_name"] as string | null) ?? null;
  const dateOfBirth = (row["date_of_birth"] as string | null) ?? null;
  const ageMonths = dateOfBirth ? ageInMonths(dateOfBirth, asOf) : null;
  const householdRole = String(row["role"] ?? "other");

  return {
    id: String(row["member_id"]),
    firstName,
    lastName: String(row["last_name"]),
    preferredName,
    name: called({ firstName, preferredName }),
    dateOfBirth,
    ageMonths,
    householdRole,
    isChild:
      ageMonths !== null ? ageMonths < CHILD_UNDER_YEARS * 12 : householdRole === "child",
    allergies: (row["allergies"] as string | null) ?? null,
    medicalNote: (row["medical_note"] as string | null) ?? null,
  };
}

function assemble(rows: Record<string, unknown>[], asOf: string): PersonMatch[] {
  const bySeed = new Map<
    string,
    { rank: number; householdId: string | null; householdName: string | null; members: LookupPerson[] }
  >();

  for (const row of rows) {
    const seedId = String(row["seed_id"]);
    const entry = bySeed.get(seedId) ?? {
      rank: Number(row["rank"] ?? 0),
      householdId: (row["household_id"] as string | null) ?? null,
      householdName: (row["household_name"] as string | null) ?? null,
      members: [],
    };
    entry.members.push(person(row, asOf));
    bySeed.set(seedId, entry);
  }

  const out: PersonMatch[] = [];

  for (const [seedId, entry] of bySeed) {
    // Children first inside a household, because they are what the queue is for.
    entry.members.sort(
      (a, b) =>
        Number(b.isChild) - Number(a.isChild) ||
        (a.ageMonths ?? Number.MAX_SAFE_INTEGER) - (b.ageMonths ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name),
    );
    const matchedPerson = entry.members.find((p) => p.id === seedId);
    if (!matchedPerson) continue;
    out.push({
      person: matchedPerson,
      householdId: entry.householdId,
      householdName: entry.householdName,
      household: entry.members,
    });
  }

  // The union loses the seed ordering, so confidence is applied here: the name
  // somebody typed the start of, then alphabetical.
  return out.sort((a, b) => {
    const seedA = bySeed.get(a.person.id)!;
    const seedB = bySeed.get(b.person.id)!;
    return (
      seedA.rank - seedB.rank ||
      a.person.lastName.localeCompare(b.person.lastName) ||
      a.person.name.localeCompare(b.person.name)
    );
  });
}
