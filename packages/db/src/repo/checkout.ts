import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { Tx } from "../client";
import { checkinVisits, checkinOverrides } from "../schema/checkin";
import { people, householdMemberships, relationships } from "../schema/people";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { readCode } from "./codes";
import { canCheckIn } from "./checkin";
import type { WriteActor } from "./people";

/**
 * R8.7 to R8.9. Letting a child go.
 *
 * This is the function the whole of check-in exists to protect. Three questions
 * are asked before a child is released, and each has exactly one answer that
 * passes it: the code on the guardian's label, the person collecting being
 * somebody the church has recorded as allowed to, and no restriction standing
 * between them.
 *
 * Any of the three can be overridden, because a real Sunday produces cases no
 * rule anticipated. None of them can be overridden quietly: an override names
 * the person who authorised it, the child, what was passed, and why, and that
 * row cannot be edited afterwards.
 */

export type OverrideKind = "code" | "pickup" | "restriction";

export interface PickupPerson {
  id: string;
  name: string;
  /** How the church knows them: "guardian", "emergency_contact" or "household". */
  basis: string;
  /** R8.9. A restriction stands between this person and this child. */
  restricted: boolean;
}

export interface CheckoutRequest {
  visitId: string;
  /** What was typed off the guardian's label. */
  code?: string | null;
  /** Who is collecting, where the church holds a record of them. */
  collectedBy?: string | null;
  override?: { kind: OverrideKind; reason: string } | null;
  userId?: string | null;
  /** R8.23. When it happened at the station, where that is not now. */
  at?: string | null;
}

/**
 * R8.8. Who the church has recorded as allowed to collect this child.
 *
 * Three ways somebody qualifies: they are a recorded guardian, they are an
 * emergency contact, or they live in the same household. The third is there
 * because a church that has to name every parent before a Sunday works will
 * stop using the list, and a list nobody maintains protects nobody.
 *
 * A restriction does not remove somebody from the list. It marks them, so the
 * volunteer is told why they are being stopped rather than being told nothing.
 */
export async function pickupList(db: Tx, childId: string): Promise<PickupPerson[]> {
  const named = await db
    .select({ id: relationships.relatedPersonId, kind: relationships.kind })
    .from(relationships)
    .where(and(
      eq(relationships.personId, childId),
      inArray(relationships.kind, ["guardian", "emergency_contact"]),
    ));

  const [membership] = await db
    .select({ householdId: householdMemberships.householdId })
    .from(householdMemberships)
    .where(and(
      eq(householdMemberships.personId, childId),
      isNull(householdMemberships.endedOn),
    ))
    .limit(1);

  const housemates = membership
    ? await db
        .select({ id: householdMemberships.personId })
        .from(householdMemberships)
        .where(and(
          eq(householdMemberships.householdId, membership.householdId),
          isNull(householdMemberships.endedOn),
        ))
    : [];

  const basis = new Map<string, string>();
  for (const row of housemates) if (row.id !== childId) basis.set(row.id, "household");
  for (const row of named) basis.set(row.id, row.kind);

  if (basis.size === 0) return [];

  const blocked = new Set(await restrictedAgainst(db, childId));

  const rows = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
    })
    .from(people)
    .where(and(inArray(people.id, [...basis.keys()]), isNull(people.archivedAt)));

  return rows
    .map((r) => ({
      id: r.id,
      name: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
      basis: basis.get(r.id) ?? "household",
      restricted: blocked.has(r.id),
    }))
    .sort((a, b) => a.basis.localeCompare(b.basis) || a.name.localeCompare(b.name));
}

/** R8.9, R2.4. Everybody a do-not-contact order names against this child. */
async function restrictedAgainst(db: Tx, childId: string): Promise<string[]> {
  const rows = await db
    .select({ a: relationships.personId, b: relationships.relatedPersonId })
    .from(relationships)
    .where(and(
      eq(relationships.kind, "do_not_contact"),
      or(eq(relationships.personId, childId), eq(relationships.relatedPersonId, childId)),
    ));

  return rows.map((r) => (r.a === childId ? r.b : r.a));
}

export interface CheckoutBlock {
  kind: OverrideKind;
  /** The catalogue key naming what stopped it. */
  key: "checkout.block.code" | "checkout.block.pickup" | "checkout.block.restriction";
}

export interface CheckoutResult {
  released: boolean;
  /** What stopped it, when it was stopped. */
  block?: CheckoutBlock;
}

/**
 * Releases a child, or says why not.
 *
 * The order of the questions is deliberate. A restriction is checked before the
 * code, because a person a court order names should be stopped whether or not
 * they are holding the right label, and a volunteer who types the code first
 * and is then told about the order has already had the conversation.
 */
export async function checkOut(
  db: Tx,
  actor: WriteActor,
  request: CheckoutRequest,
): Promise<CheckoutResult> {
  if (!canCheckIn(actor.role)) throw new PermissionError(actor.role, "checkIn");

  const [visit] = await db
    .select({
      id: checkinVisits.id,
      personId: checkinVisits.personId,
      code: checkinVisits.code,
      checkedOutAt: checkinVisits.checkedOutAt,
    })
    .from(checkinVisits)
    .where(eq(checkinVisits.id, request.visitId))
    .limit(1);

  if (!visit) throw new InvalidInputError("checkout.error.missing");
  // R8.7. Twice is refused, and the screen says who has them.
  if (visit.checkedOutAt) throw new InvalidInputError("checkout.error.already");

  const override = request.override ?? null;

  if (request.collectedBy) {
    const restricted = await restrictedAgainst(db, visit.personId);
    if (restricted.includes(request.collectedBy) && override?.kind !== "restriction") {
      return { released: false, block: { kind: "restriction", key: "checkout.block.restriction" } };
    }

    const allowed = await pickupList(db, visit.personId);
    const onList = allowed.some((p) => p.id === request.collectedBy);
    if (!onList && override?.kind !== "pickup") {
      return { released: false, block: { kind: "pickup", key: "checkout.block.pickup" } };
    }
  }

  // R8.7. The code, or a decision somebody made instead of it.
  const typed = readCode(request.code ?? "");
  const matches = visit.code !== null && typed === visit.code;
  if (!matches && override?.kind !== "code") {
    return { released: false, block: { kind: "code", key: "checkout.block.code" } };
  }

  if (override) {
    const reason = override.reason.trim();
    if (!reason) throw new InvalidInputError("checkout.error.reason");

    await db.insert(checkinOverrides).values({
      tenantId: actor.tenantId,
      visitId: visit.id,
      reasonKind: override.kind,
      reason,
      authorisedBy: request.userId ?? null,
      collectedBy: request.collectedBy ?? null,
    });
  }

  await db
    .update(checkinVisits)
    .set({
      checkedOutAt: request.at ? new Date(request.at) : new Date(),
      checkedOutTo: request.collectedBy ?? null,
    })
    .where(eq(checkinVisits.id, visit.id));

  return { released: true };
}

export interface OverrideRecord {
  id: string;
  visitId: string;
  childName: string;
  reasonKind: string;
  reason: string;
  collectedByName: string | null;
  createdAt: Date;
}

/** R8.7. What was decided, for the supervisor dashboard and for afterwards. */
export async function overridesFor(db: Tx, occurrenceId: string): Promise<OverrideRecord[]> {
  const rows = await db
    .select({
      id: checkinOverrides.id,
      visitId: checkinOverrides.visitId,
      reasonKind: checkinOverrides.reasonKind,
      reason: checkinOverrides.reason,
      createdAt: checkinOverrides.createdAt,
      collectedBy: checkinOverrides.collectedBy,
      childFirst: people.firstName,
      childLast: people.lastName,
      childPreferred: people.preferredName,
    })
    .from(checkinOverrides)
    .innerJoin(checkinVisits, eq(checkinVisits.id, checkinOverrides.visitId))
    .innerJoin(people, eq(people.id, checkinVisits.personId))
    .where(eq(checkinVisits.occurrenceId, occurrenceId));

  const collectorIds = rows.map((r) => r.collectedBy).filter((id): id is string => id !== null);
  const collectors = collectorIds.length
    ? await db
        .select({ id: people.id, firstName: people.firstName, lastName: people.lastName })
        .from(people)
        .where(inArray(people.id, collectorIds))
    : [];

  return rows.map((r) => {
    const collector = collectors.find((c) => c.id === r.collectedBy);
    return {
      id: r.id,
      visitId: r.visitId,
      childName: `${r.childPreferred?.trim() || r.childFirst} ${r.childLast}`,
      reasonKind: r.reasonKind,
      reason: r.reason,
      collectedByName: collector ? `${collector.firstName} ${collector.lastName}` : null,
      createdAt: r.createdAt,
    };
  });
}

/** R8.7. Who has already been collected, and when, for the twice case. */
export async function collectedAt(db: Tx, visitId: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: checkinVisits.checkedOutAt })
    .from(checkinVisits)
    .where(eq(checkinVisits.id, visitId))
    .limit(1);
  return row?.at ?? null;
}
