import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { Tx } from "../client";
import { relationships, members } from "../schema/members";
import { canEditPeople, canArchivePeople, PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";

/**
 * R2.4. Relationships, independent of household.
 *
 * Household says who lives together. It does not say who may collect a child,
 * who to ring when someone collapses in the car park, or which parent a court
 * has ordered must not be told where the child is during a service. Those three
 * questions are the reason this table exists separately, and R8.9 makes the
 * third one a blocking control at check-in.
 *
 * A row reads "the related person is the KIND of this person". On Ava's record,
 * a `parent` row pointing at Michael means Michael is Ava's parent.
 */

export const RELATIONSHIP_KINDS = [
  "spouse", "parent", "child", "guardian", "emergency_contact", "do_not_contact",
] as const;

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

/**
 * The row written on the other person, so both records agree.
 *
 * Spouse and do-not-contact are mutual by definition. Parent and child are each
 * other's inverse. Guardian and emergency contact are one-way: being someone's
 * emergency contact does not make them yours, and saying so would invent a fact
 * nobody entered.
 */
const INVERSE: Partial<Record<RelationshipKind, RelationshipKind>> = {
  spouse: "spouse",
  parent: "child",
  child: "parent",
  do_not_contact: "do_not_contact",
};

/** The kinds a do-not-contact order cancels, in both directions. */
const CONTACT_KINDS: RelationshipKind[] = ["guardian", "emergency_contact"];

export interface RelationshipView {
  id: string;
  kind: RelationshipKind;
  memberId: string;
  relatedMemberId: string;
  /** R24.6. Their readable address, so the row links without an id in it. */
  relatedSlug: string;
  relatedName: string;
  relatedArchived: boolean;
  notes: string | null;
}

/** The order relationships are read in: safeguarding first, then the family. */
const KIND_ORDER: Record<RelationshipKind, number> = {
  do_not_contact: 0, guardian: 1, emergency_contact: 2,
  spouse: 3, parent: 4, child: 5,
};

export async function listRelationships(db: Tx, memberId: string): Promise<RelationshipView[]> {
  const rows = await db
    .select({
      id: relationships.id,
      kind: relationships.kind,
      memberId: relationships.memberId,
      relatedMemberId: relationships.relatedMemberId,
      relatedSlug: members.slug,
      firstName: members.firstName,
      preferredName: members.preferredName,
      lastName: members.lastName,
      archivedAt: members.archivedAt,
      notes: relationships.notes,
    })
    .from(relationships)
    .innerJoin(members, eq(members.id, relationships.relatedMemberId))
    .where(eq(relationships.memberId, memberId))
    .orderBy(asc(members.lastName), asc(members.firstName));

  return rows
    .map((r): RelationshipView => ({
      id: r.id,
      kind: r.kind as RelationshipKind,
      memberId: r.memberId,
      relatedMemberId: r.relatedMemberId,
      relatedSlug: r.relatedSlug,
      relatedName: `${r.preferredName ?? r.firstName} ${r.lastName}`,
      relatedArchived: r.archivedAt !== null,
      notes: r.notes,
    }))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/**
 * R2.4 and R8.9. The members this person must not be put in contact with.
 *
 * Read on its own rather than filtered out of the list above, because the
 * callers that matter most (the directory in R3.x, checkout in R8.9) want the
 * answer to one question and should not have to know the shape of this table.
 */
export async function doNotContactIds(db: Tx, memberId: string): Promise<string[]> {
  const rows = await db
    .select({ id: relationships.relatedMemberId })
    .from(relationships)
    .where(and(
      eq(relationships.memberId, memberId),
      eq(relationships.kind, "do_not_contact"),
    ));
  return rows.map((r) => r.id);
}

/** True when a do-not-contact order exists between two members, in either direction. */
export async function isDoNotContact(db: Tx, a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ id: relationships.id })
    .from(relationships)
    .where(and(
      eq(relationships.kind, "do_not_contact"),
      or(
        and(eq(relationships.memberId, a), eq(relationships.relatedMemberId, b)),
        and(eq(relationships.memberId, b), eq(relationships.relatedMemberId, a)),
      ),
    ))
    .limit(1);
  return row !== undefined;
}

export interface RelationshipInput {
  memberId: string;
  relatedMemberId: string;
  kind: RelationshipKind;
  notes?: string | null;
}

export interface RelationshipResult {
  /** How many rows were written, counting the one on the other person. */
  added: number;
  /** Contact rows a do-not-contact order cancelled. */
  cancelled: number;
}

/**
 * Records a relationship, and its inverse where one exists.
 *
 * A do-not-contact order cancels any guardian or emergency contact row between
 * the same two members rather than being refused because one exists. The order
 * arrives after the custody hearing, the emergency contact was entered a year
 * earlier, and a safeguarding instruction that a church has to tidy up before
 * it will take effect is an instruction that does not take effect.
 */
export async function addRelationship(
  db: Tx,
  actor: WriteActor,
  input: RelationshipInput,
): Promise<RelationshipResult> {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "editRelationship");

  const { memberId, relatedMemberId, kind } = input;
  if (memberId === relatedMemberId) throw new InvalidInputError("relationship.error.self");

  const found = await db
    .select({ id: members.id })
    .from(members)
    .where(inArray(members.id, [memberId, relatedMemberId]));
  if (found.length < 2) throw new InvalidInputError("relationship.error.notFound");

  let cancelled = 0;

  if (kind === "do_not_contact") {
    const gone = await db
      .delete(relationships)
      .where(and(
        inArray(relationships.kind, CONTACT_KINDS),
        or(
          and(eq(relationships.memberId, memberId), eq(relationships.relatedMemberId, relatedMemberId)),
          and(eq(relationships.memberId, relatedMemberId), eq(relationships.relatedMemberId, memberId)),
        ),
      ))
      .returning({ id: relationships.id });
    cancelled = gone.length;
  } else if (CONTACT_KINDS.includes(kind) && await isDoNotContact(db, memberId, relatedMemberId)) {
    throw new InvalidInputError("relationship.error.doNotContact");
  }

  const notes = input.notes?.trim() || null;
  const rows: { memberId: string; relatedMemberId: string; kind: RelationshipKind }[] = [
    { memberId, relatedMemberId, kind },
  ];
  const inverse = INVERSE[kind];
  if (inverse) rows.push({ memberId: relatedMemberId, relatedMemberId: memberId, kind: inverse });

  let added = 0;
  for (const row of rows) {
    const written = await db
      .insert(relationships)
      .values({ tenantId: actor.tenantId, ...row, notes })
      .onConflictDoNothing()
      .returning({ id: relationships.id });
    added += written.length;
  }

  if (added === 0) throw new InvalidInputError("relationship.error.exists");
  return { added, cancelled };
}

/**
 * Removes a relationship and its inverse.
 *
 * Lifting a do-not-contact order is narrower than recording one. Anyone who may
 * edit a person can enter the order, because the person who hears about the
 * custody arrangement minutes before a service is rarely the Owner. Taking it off
 * stays with Owner and Admin, since that is the press that lets a parent collect
 * a child again.
 */
export async function removeRelationship(
  db: Tx,
  actor: WriteActor,
  id: string,
): Promise<{ removed: number }> {
  const [row] = await db
    .select({
      memberId: relationships.memberId,
      relatedMemberId: relationships.relatedMemberId,
      kind: relationships.kind,
    })
    .from(relationships)
    .where(eq(relationships.id, id))
    .limit(1);

  if (!row) throw new InvalidInputError("relationship.error.notFound");

  const kind = row.kind as RelationshipKind;
  const permitted = kind === "do_not_contact"
    ? canArchivePeople(actor)
    : canEditPeople(actor);
  if (!permitted) {
    throw new PermissionError(
      actor.role,
      kind === "do_not_contact" ? "liftDoNotContact" : "editRelationship",
    );
  }

  const inverse = INVERSE[kind];
  const gone = await db
    .delete(relationships)
    .where(inverse
      ? or(
          eq(relationships.id, id),
          and(
            eq(relationships.memberId, row.relatedMemberId),
            eq(relationships.relatedMemberId, row.memberId),
            eq(relationships.kind, inverse),
          ),
        )
      : eq(relationships.id, id))
    .returning({ id: relationships.id });

  return { removed: gone.length };
}
