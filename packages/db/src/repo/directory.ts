import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { people, households, householdMemberships } from "../schema/people";
import { directoryPreferences } from "../schema/directory";
import { PermissionError, type TenantRole } from "../roles";
import { ageInMonths } from "./age";
import {
  DEFAULT_VISIBILITY, entryFor, type DirectoryEntry, type Visibility,
} from "./directory-rules";

/**
 * R3.1 to R3.4. The directory one member sees of another.
 *
 * A different thing from the staff directory in F2, which shows everything the
 * church holds. This one shows what each member chose to publish, and the
 * default is their name.
 *
 * Grouped by household, because that is how a church looks somebody up: the
 * Bennetts, not Michael Bennett.
 */

export const ADULT_MONTHS = 18 * 12;

export interface DirectoryHousehold {
  id: string;
  name: string;
  people: DirectoryEntry[];
}

export interface MemberPreferences extends Visibility {
  personId: string;
}

const own = (row: typeof directoryPreferences.$inferSelect | undefined): Visibility =>
  row
    ? {
        listed: row.listed,
        showEmail: row.showEmail,
        showPhone: row.showPhone,
        showAddress: row.showAddress,
        showBirthday: row.showBirthday,
        showPhoto: row.showPhoto,
        showChildren: row.showChildren,
      }
    : DEFAULT_VISIBILITY;

const called = (row: { firstName: string; lastName: string; preferredName: string | null }) =>
  `${row.preferredName?.trim() || row.firstName} ${row.lastName}`;

/**
 * R3.1. The directory, as a member sees it.
 *
 * Every field passes through the same pure rule the printed one uses, so an
 * address somebody hid cannot appear on one and not the other.
 */
export async function memberDirectory(
  db: Tx,
  opts: { asOf: string; q?: string } = { asOf: new Date().toISOString().slice(0, 10) },
): Promise<DirectoryHousehold[]> {
  const rows = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      dateOfBirth: sql<string | null>`${people.dateOfBirth}::text`,
      photoKey: people.photoKey,
      householdId: households.id,
      householdName: households.name,
      email: sql<string | null>`(
        select cm.value from contact_methods cm
         where cm.person_id = ${people.id} and cm.kind = 'email' and cm.is_primary
         limit 1
      )`,
      phone: sql<string | null>`(
        select cm.value from contact_methods cm
         where cm.person_id = ${people.id} and cm.kind = 'phone' and cm.is_primary
         limit 1
      )`,
      address: sql<string | null>`(
        select concat_ws(', ', a.line1, a.city, a.region, a.postal_code)
          from addresses a
         where a.household_id = ${households.id}
         limit 1
      )`,
      headOf: sql<string | null>`(
        select hm.person_id from household_memberships hm
         where hm.household_id = ${households.id} and hm.role = 'head' and hm.ended_on is null
         limit 1
      )`,
    })
    .from(people)
    .leftJoin(
      householdMemberships,
      and(eq(householdMemberships.personId, people.id), isNull(householdMemberships.endedOn)),
    )
    .leftJoin(households, eq(households.id, householdMemberships.householdId))
    .where(and(isNull(people.archivedAt), sql`${people.lifecycleStatus} <> 'deceased'`))
    .orderBy(asc(people.lastName), asc(people.firstName));

  const prefs = await db.select().from(directoryPreferences);
  const byPerson = new Map(prefs.map((row) => [row.personId, row]));

  const text = opts.q?.trim().toLowerCase() ?? "";
  const grouped = new Map<string, DirectoryHousehold>();
  const loose: DirectoryEntry[] = [];

  for (const row of rows) {
    const months = row.dateOfBirth ? ageInMonths(row.dateOfBirth, opts.asOf) : null;
    const isChild = months !== null && months < ADULT_MONTHS;
    const head = row.headOf ? own(byPerson.get(row.headOf)) : null;

    const entry = entryFor(
      {
        id: row.id,
        name: called(row),
        isChild,
        email: row.email,
        phone: row.phone,
        address: row.address,
        birthday: row.dateOfBirth,
        photoKey: row.photoKey,
      },
      own(byPerson.get(row.id)),
      head,
    );
    if (!entry) continue;

    if (text && !entry.name.toLowerCase().includes(text)
      && !(row.householdName ?? "").toLowerCase().includes(text)) {
      continue;
    }

    if (!row.householdId) {
      loose.push(entry);
      continue;
    }
    const household = grouped.get(row.householdId) ?? {
      id: row.householdId,
      name: row.householdName ?? entry.name,
      people: [],
    };
    household.people.push(entry);
    grouped.set(row.householdId, household);
  }

  const all = [...grouped.values()];
  for (const entry of loose) {
    all.push({ id: entry.id, name: entry.name, people: [entry] });
  }
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

/** R3.2. What this person has chosen, or the defaults they have never touched. */
export async function directoryPreferencesFor(
  db: Tx,
  personId: string,
): Promise<MemberPreferences> {
  const [row] = await db
    .select()
    .from(directoryPreferences)
    .where(eq(directoryPreferences.personId, personId))
    .limit(1);
  return { personId, ...own(row) };
}

/**
 * R3.2, R3.3. A member changing their own mind.
 *
 * Only their own, except for the roles that administer the church, because a
 * volunteer admin has to be able to take somebody out of the directory when
 * they ring up and ask.
 */
export async function setDirectoryPreferences(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; personId?: string | null },
  personId: string,
  input: Partial<Visibility>,
): Promise<MemberPreferences> {
  const theirs = actor.personId === personId;
  const administers = ["owner", "admin", "staff"].includes(actor.role);
  if (!theirs && !administers) throw new PermissionError(actor.role, "editDirectoryPrivacy");

  const current = await directoryPreferencesFor(db, personId);
  const next: Visibility = {
    listed: input.listed ?? current.listed,
    showEmail: input.showEmail ?? current.showEmail,
    showPhone: input.showPhone ?? current.showPhone,
    showAddress: input.showAddress ?? current.showAddress,
    showBirthday: input.showBirthday ?? current.showBirthday,
    showPhoto: input.showPhoto ?? current.showPhoto,
    showChildren: input.showChildren ?? current.showChildren,
  };

  await db
    .insert(directoryPreferences)
    .values({ tenantId: actor.tenantId, personId, ...next })
    .onConflictDoUpdate({
      target: [directoryPreferences.tenantId, directoryPreferences.personId],
      set: { ...next, updatedAt: new Date() },
    });

  return { personId, ...next };
}

/** R3.4. Whether this person heads a household, which is who decides for its children. */
export async function householdHeadIs(db: Tx, personId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: householdMemberships.id })
    .from(householdMemberships)
    .where(
      and(
        eq(householdMemberships.personId, personId),
        eq(householdMemberships.role, "head"),
        isNull(householdMemberships.endedOn),
      ),
    )
    .limit(1);
  return row !== undefined;
}
