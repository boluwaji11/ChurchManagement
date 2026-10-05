import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { people, contactMethods } from "../schema/people";
import { appUsers } from "../schema/tenancy";
import { canEditPeople, PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";
import { LOOKS_LIKE_EMAIL } from "./form-rules";

/**
 * R2.4. Every way a church has of reaching somebody.
 *
 * The storage held many and every screen read one, so a second address a merge
 * moved across was in the record and invisible, and an edit could overwrite
 * the primary with no sign the others existed. These are what the screens read
 * now.
 *
 * The address somebody signs in with is not one of these: it belongs to the
 * account, not to the record. It is reported here so a church can see it, and
 * refused for removal here so nobody takes away a way in by tidying a profile.
 */

export const CONTACT_LABELS = ["home", "mobile", "work", "other"] as const;
export type ContactLabel = (typeof CONTACT_LABELS)[number];
export type ContactKind = "email" | "phone";

export interface PersonContact {
  id: string;
  kind: ContactKind;
  label: ContactLabel;
  value: string;
  isPrimary: boolean;
  /** R17.1. The address this person signs in with, which cannot be removed here. */
  isSignIn: boolean;
}

const ENOUGH_DIGITS = 7;

/** R2.4. Everything on a person, primary first, the way a card reads it. */
export async function listContacts(db: Tx, personId: string): Promise<PersonContact[]> {
  const [owner] = await db
    .select({ email: appUsers.email })
    .from(people)
    .leftJoin(appUsers, eq(appUsers.id, people.appUserId))
    .where(eq(people.id, personId))
    .limit(1);

  const signIn = owner?.email?.trim().toLowerCase() ?? null;

  const rows = await db
    .select({
      id: contactMethods.id,
      kind: contactMethods.kind,
      label: contactMethods.label,
      value: contactMethods.value,
      isPrimary: contactMethods.isPrimary,
    })
    .from(contactMethods)
    .where(eq(contactMethods.personId, personId))
    .orderBy(asc(contactMethods.kind), desc(contactMethods.isPrimary), asc(contactMethods.createdAt));

  return rows.map((row) => ({
    ...row,
    kind: row.kind as ContactKind,
    label: row.label as ContactLabel,
    isSignIn: row.kind === "email" && signIn !== null && row.value.trim().toLowerCase() === signIn,
  }));
}

function checkValue(kind: ContactKind, value: string): string {
  const cleaned = value.trim();
  if (!cleaned) throw new InvalidInputError("contact.error.empty");

  if (kind === "email") {
    if (!LOOKS_LIKE_EMAIL.test(cleaned)) throw new InvalidInputError("contact.error.email");
    return cleaned.toLowerCase();
  }
  if (cleaned.replace(/\D/g, "").length < ENOUGH_DIGITS) {
    throw new InvalidInputError("contact.error.phone");
  }
  return cleaned;
}

/** R2.4. Another way to reach somebody. The first of a kind leads it. */
export async function addContact(
  db: Tx,
  actor: WriteActor,
  personId: string,
  input: { kind: ContactKind; label?: ContactLabel; value: string },
): Promise<{ id: string }> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");
  const value = checkValue(input.kind, input.value);

  const held = await db
    .select({ id: contactMethods.id, value: contactMethods.value })
    .from(contactMethods)
    .where(and(eq(contactMethods.personId, personId), eq(contactMethods.kind, input.kind)));

  // The same address twice is somebody pressing add on what is already there.
  if (held.some((one) => one.value.trim().toLowerCase() === value.toLowerCase())) {
    throw new InvalidInputError("contact.error.already");
  }

  const [row] = await db
    .insert(contactMethods)
    .values({
      tenantId: actor.tenantId,
      personId,
      kind: input.kind,
      label: input.label ?? (input.kind === "email" ? "home" : "mobile"),
      value,
      isPrimary: held.length === 0,
    })
    .returning({ id: contactMethods.id });
  return { id: row!.id };
}

/**
 * R2.4, R17.1. Takes one away.
 *
 * The address somebody signs in with stays. Removing it here would read as
 * closing their account and would not, so it is refused and said.
 */
export async function removeContact(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");

  const [row] = await db
    .select({
      personId: contactMethods.personId,
      kind: contactMethods.kind,
      value: contactMethods.value,
      isPrimary: contactMethods.isPrimary,
    })
    .from(contactMethods)
    .where(eq(contactMethods.id, id))
    .limit(1);
  if (!row) throw new InvalidInputError("contact.error.missing");

  const all = await listContacts(db, row.personId);
  if (all.find((one) => one.id === id)?.isSignIn) {
    throw new InvalidInputError("contact.error.signIn");
  }

  await db.delete(contactMethods).where(eq(contactMethods.id, id));

  // Something has to lead, so the oldest of that kind takes over.
  if (row.isPrimary) await leadWith(db, row.personId, row.kind as ContactKind, null);
}

/** R2.4. Which one a letter or a call goes to first. */
export async function makeContactPrimary(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");

  const [row] = await db
    .select({ personId: contactMethods.personId, kind: contactMethods.kind })
    .from(contactMethods)
    .where(eq(contactMethods.id, id))
    .limit(1);
  if (!row) throw new InvalidInputError("contact.error.missing");

  await leadWith(db, row.personId, row.kind as ContactKind, id);
}

/**
 * R2.4. Exactly one of a kind leads.
 *
 * With no id, the oldest takes over, which is what should happen when the one
 * that led is removed. Also run after a merge, where two records each brought
 * a primary of their own.
 */
export async function leadWith(
  db: Tx,
  personId: string,
  kind: ContactKind,
  id: string | null,
): Promise<void> {
  const chosen = id ?? (
    await db
      .select({ id: contactMethods.id })
      .from(contactMethods)
      .where(and(eq(contactMethods.personId, personId), eq(contactMethods.kind, kind)))
      .orderBy(asc(contactMethods.createdAt))
      .limit(1)
  )[0]?.id ?? null;

  if (!chosen) return;

  await db
    .update(contactMethods)
    .set({ isPrimary: false })
    .where(and(
      eq(contactMethods.personId, personId),
      eq(contactMethods.kind, kind),
      ne(contactMethods.id, chosen),
    ));

  await db
    .update(contactMethods)
    .set({ isPrimary: true })
    .where(eq(contactMethods.id, chosen));
}

export interface PersonAddress {
  id: string;
  label: ContactLabel;
  line1: string;
  line2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  isPrimary: boolean;
  /** R2.4. Held by the household rather than by this person. */
  fromHousehold: boolean;
}

/** R2.4. Where somebody lives: theirs, and the household's. */
export async function listAddresses(db: Tx, personId: string): Promise<PersonAddress[]> {
  const rows = await db.execute<{
    id: string;
    label: string;
    line1: string;
    line2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    country: string;
    isPrimary: boolean;
    fromHousehold: boolean;
  }>(sql`
    select a.id, a.label::text as label, a.line1, a.line2, a.city, a.region,
           a.postal_code as "postalCode", a.country, a.is_primary as "isPrimary",
           (a.person_id is null) as "fromHousehold"
      from addresses a
     where a.person_id = ${personId}
        or a.household_id in (
          select m.household_id from household_memberships m
           where m.person_id = ${personId} and m.ended_on is null
        )
     order by (a.person_id is null), a.is_primary desc, a.created_at`);

  return rows.map((row) => ({ ...row, label: row.label as ContactLabel }));
}
