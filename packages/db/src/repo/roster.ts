import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { members, householdMemberships, households, contactMethods, relationships } from "../schema/members";
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
  members: RosterPerson[];
  /** R8.8. Who may collect each child, by child. */
  pickup: Record<string, RosterPickup[]>;
}

export async function stationRoster(db: Tx, opts: { asOf: string }): Promise<Roster> {
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
      dateOfBirth: sql<string | null>`${members.dateOfBirth}::text`,
      allergies: members.allergies,
      medicalNote: members.medicalNote,
      householdId: householdMemberships.householdId,
      householdName: households.name,
      role: householdMemberships.role,
    })
    .from(members)
    .leftJoin(
      householdMemberships,
      and(eq(householdMemberships.memberId, members.id), isNull(householdMemberships.endedOn)),
    )
    .leftJoin(households, eq(households.id, householdMemberships.householdId))
    .where(isNull(members.archivedAt));

  const phones = await db
    .select({ memberId: contactMethods.memberId, value: contactMethods.value })
    .from(contactMethods)
    .where(eq(contactMethods.kind, "phone"));

  const byPerson = new Map<string, string[]>();
  for (const row of phones) {
    const list = byPerson.get(row.memberId) ?? [];
    list.push(row.value);
    byPerson.set(row.memberId, list);
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
    members: roster,
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
      childId: relationships.memberId,
      memberId: relationships.relatedMemberId,
      kind: relationships.kind,
    })
    .from(relationships)
    .where(
      and(
        inArray(relationships.memberId, childIds),
        inArray(relationships.kind, ["guardian", "emergency_contact"]),
      ),
    );

  const restrictions = await db
    .select({ a: relationships.memberId, b: relationships.relatedMemberId })
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
      if (row.childId === child.id) basis.set(row.memberId, row.kind);
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
