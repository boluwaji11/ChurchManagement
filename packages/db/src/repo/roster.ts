import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { people, householdMemberships, households, contactMethods, relationships } from "../schema/people";
import { ageInMonths } from "./age";
import type { Matchable } from "./match";
import { CHILD_UNDER_YEARS } from "./lookup";

/**
 * R8.20. Everything a station needs before the network goes.
 *
 * Pulled whole rather than page by page, because the point of it is that
 * nothing has to be fetched once the wifi drops. A church of five hundred is
 * a few hundred kilobytes, which a tablet holds without noticing.
 */

export interface RosterPerson extends Matchable {
  householdId: string | null;
  householdRole: string;
  dateOfBirth: string | null;
  ageMonths: number | null;
  isChild: boolean;
  /** R8.10. What the room has to know. Null means nothing is recorded. */
  allergies: string | null;
  medicalNote: string | null;
}

export interface RosterPickup {
  id: string;
  name: string;
  basis: string;
  restricted: boolean;
}

export interface Roster {
  /** When it was pulled, so the station can say how old what it holds is. */
  takenAt: string;
  asOf: string;
  people: RosterPerson[];
  /** R8.8. Who may collect each child, by child. */
  pickup: Record<string, RosterPickup[]>;
}

export async function stationRoster(db: Tx, opts: { asOf: string }): Promise<Roster> {
  const rows = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      dateOfBirth: sql<string | null>`${people.dateOfBirth}::text`,
      allergies: people.allergies,
      medicalNote: people.medicalNote,
      householdId: householdMemberships.householdId,
      householdName: households.name,
      role: householdMemberships.role,
    })
    .from(people)
    .leftJoin(
      householdMemberships,
      and(eq(householdMemberships.personId, people.id), isNull(householdMemberships.endedOn)),
    )
    .leftJoin(households, eq(households.id, householdMemberships.householdId))
    .where(isNull(people.archivedAt));

  const phones = await db
    .select({ personId: contactMethods.personId, value: contactMethods.value })
    .from(contactMethods)
    .where(eq(contactMethods.kind, "phone"));

  const byPerson = new Map<string, string[]>();
  for (const row of phones) {
    const list = byPerson.get(row.personId) ?? [];
    list.push(row.value);
    byPerson.set(row.personId, list);
  }

  const roster: RosterPerson[] = rows.map((r) => {
    const months = r.dateOfBirth ? ageInMonths(r.dateOfBirth, opts.asOf) : null;
    const householdRole = r.role ?? "other";
    return {
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      preferredName: r.preferredName,
      householdName: r.householdName,
      phones: byPerson.get(r.id) ?? [],
      householdId: r.householdId,
      householdRole,
      dateOfBirth: r.dateOfBirth,
      ageMonths: months,
      isChild: months !== null ? months < CHILD_UNDER_YEARS * 12 : householdRole === "child",
      allergies: r.allergies,
      medicalNote: r.medicalNote,
    };
  });

  return {
    takenAt: new Date().toISOString(),
    asOf: opts.asOf,
    people: roster,
    pickup: await pickupLists(db, roster),
  };
}

/**
 * R8.8. The pickup list for every child, in two queries rather than one a child.
 *
 * Who may collect a child is a recorded guardian, an emergency contact, or
 * somebody who lives with them. A restriction marks a person rather than
 * removing them, so the volunteer is told why somebody is being stopped.
 */
async function pickupLists(
  db: Tx,
  roster: RosterPerson[],
): Promise<Record<string, RosterPickup[]>> {
  const children = roster.filter((p) => p.isChild);
  if (children.length === 0) return {};

  const childIds = children.map((c) => c.id);
  const named = await db
    .select({
      childId: relationships.personId,
      personId: relationships.relatedPersonId,
      kind: relationships.kind,
    })
    .from(relationships)
    .where(
      and(
        inArray(relationships.personId, childIds),
        inArray(relationships.kind, ["guardian", "emergency_contact"]),
      ),
    );

  const restrictions = await db
    .select({ a: relationships.personId, b: relationships.relatedPersonId })
    .from(relationships)
    .where(eq(relationships.kind, "do_not_contact"));

  const byId = new Map(roster.map((p) => [p.id, p]));
  const called = (p: RosterPerson) =>
    `${p.preferredName?.trim() || p.firstName} ${p.lastName}`;

  const out: Record<string, RosterPickup[]> = {};

  for (const child of children) {
    const basis = new Map<string, string>();

    if (child.householdId) {
      for (const person of roster) {
        if (person.householdId === child.householdId && person.id !== child.id) {
          basis.set(person.id, "household");
        }
      }
    }
    for (const row of named) {
      if (row.childId === child.id) basis.set(row.personId, row.kind);
    }
    if (basis.size === 0) continue;

    const blocked = new Set(
      restrictions
        .filter((r) => r.a === child.id || r.b === child.id)
        .map((r) => (r.a === child.id ? r.b : r.a)),
    );

    out[child.id] = [...basis.entries()]
      .flatMap(([id, how]) => {
        const person = byId.get(id);
        return person
          ? [{ id, name: called(person), basis: how, restricted: blocked.has(id) }]
          : [];
      })
      .sort((a, b) => a.basis.localeCompare(b.basis) || a.name.localeCompare(b.name));
  }

  return out;
}
