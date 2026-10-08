import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { households, householdMemberships, members } from "../schema/members";
import { PermissionError, canManageHouseholds } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";

/**
 * R2.1. The households a church keeps, as things in their own right.
 *
 * A household was only ever a side effect of editing a person, which left a
 * church with no way to see a family, rename one, or put two halves of the same
 * family back together. This is that screen's data.
 */

export interface HouseholdRow {
  id: string;
  name: string;
  members: { id: string; slug: string; name: string; role: string }[];
  archived: boolean;
}

function guard(actor: WriteActor): void {
  if (!canManageHouseholds(actor)) {
    throw new PermissionError(actor.role, "manageHouseholds");
  }
}

const clean = (raw: string): string => raw.trim().replace(/\s+/g, " ");

export async function listHouseholdRows(
  db: Tx,
  opts: { includeArchived?: boolean; archivedOnly?: boolean } = {},
): Promise<HouseholdRow[]> {
  const rows = await db
    .select({
      id: households.id,
      name: households.name,
      archivedAt: households.archivedAt,
      members: sql<HouseholdRow["members"]>`coalesce(
        (
          select json_agg(m order by m.role, m.name)
            from (
              select p.id,
                     p.slug,
                     coalesce(p.preferred_name, p.first_name) || ' ' || p.last_name as name,
                     hm.role::text as role
                from household_memberships hm
                join members p on p.id = hm.member_id
               where hm.household_id = households.id
                 and p.archived_at is null
            ) m
        ),
        '[]'::json
      )`,
    })
    .from(households)
    .where(
      opts.archivedOnly
        ? sql`${households.archivedAt} is not null`
        : opts.includeArchived
          ? undefined
          : isNull(households.archivedAt),
    )
    .orderBy(asc(households.name));

  return rows.map(({ archivedAt, ...row }) => ({
    ...row,
    members: row.members ?? [],
    archived: archivedAt !== null,
  }));
}

/** R2.1. How many households have been put away, for the link that goes to them. */
export async function countArchivedHouseholds(db: Tx): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(households)
    .where(sql`${households.archivedAt} is not null`);
  return row?.count ?? 0;
}

/** R2.1. A family named before anybody is put in it. */
export async function createHousehold(
  db: Tx,
  actor: WriteActor,
  name: string,
): Promise<{ id: string }> {
  guard(actor);

  const title = clean(name);
  if (!title) throw new InvalidInputError("households.error.name");

  const [row] = await db
    .insert(households)
    .values({ tenantId: actor.tenantId, name: title })
    .returning({ id: households.id });

  return row!;
}

/**
 * R2.1. People a church could put into a household.
 *
 * Only those in none, because somebody can live in one household at a time and
 * offering a name that is already in another is offering a mistake.
 */
export async function peopleWithoutHousehold(
  db: Tx,
  search = "",
  limit = 20,
): Promise<{ id: string; slug: string; name: string }[]> {
  const needle = search.trim();

  const rows = await db
    .select({
      id: members.id,
      slug: members.slug,
      name: sql<string>`coalesce(${members.preferredName}, ${members.firstName}) || ' ' || ${members.lastName}`,
    })
    .from(members)
    .where(
      and(
        isNull(members.archivedAt),
        sql`not exists (
          select 1 from household_memberships hm where hm.member_id = ${members.id}
        )`,
        needle
          ? sql`(
              lower(coalesce(${members.preferredName}, ${members.firstName})) like ${`%${needle.toLowerCase()}%`}
              or lower(${members.lastName}) like ${`%${needle.toLowerCase()}%`}
            )`
          : undefined,
      ),
    )
    .orderBy(asc(members.lastName), asc(members.firstName))
    .limit(limit);

  return rows;
}

/** R2.1. Puts somebody into a household. */
export async function addToHousehold(
  db: Tx,
  actor: WriteActor,
  householdId: string,
  memberId: string,
  role = "other",
): Promise<void> {
  guard(actor);

  const [already] = await db
    .select({ id: householdMemberships.id })
    .from(householdMemberships)
    .where(eq(householdMemberships.memberId, memberId))
    .limit(1);
  if (already) throw new InvalidInputError("households.error.alreadyIn");

  await db.insert(householdMemberships).values({
    tenantId: actor.tenantId,
    householdId,
    memberId,
    role: role as "head" | "spouse" | "child" | "other",
  });
}

/** R2.1. What somebody is in their household: head, spouse, child or other. */
export async function setHouseholdRole(
  db: Tx,
  actor: WriteActor,
  householdId: string,
  memberId: string,
  role: string,
): Promise<void> {
  guard(actor);

  const changed = await db
    .update(householdMemberships)
    .set({ role: role as "head" | "spouse" | "child" | "other" })
    .where(and(
      eq(householdMemberships.householdId, householdId),
      eq(householdMemberships.memberId, memberId),
    ))
    .returning({ id: householdMemberships.id });

  if (changed.length === 0) throw new InvalidInputError("households.error.missing");
}

/**
 * R2.1. Takes somebody out of a household.
 *
 * Their own record is untouched. They stop being shown as living with this
 * family and can be put into another.
 */
export async function removeFromHousehold(
  db: Tx,
  actor: WriteActor,
  householdId: string,
  memberId: string,
): Promise<void> {
  guard(actor);

  await db
    .delete(householdMemberships)
    .where(and(
      eq(householdMemberships.householdId, householdId),
      eq(householdMemberships.memberId, memberId),
    ));
}

export async function renameHousehold(
  db: Tx,
  actor: WriteActor,
  id: string,
  name: string,
): Promise<void> {
  guard(actor);

  const title = clean(name);
  if (!title) throw new InvalidInputError("households.error.name");

  const changed = await db
    .update(households)
    .set({ name: title })
    .where(eq(households.id, id))
    .returning({ id: households.id });

  if (changed.length === 0) throw new InvalidInputError("households.error.missing");
}

/**
 * R2.1. Puts a household away, or brings it back.
 *
 * Archived rather than deleted, like every other record. The members in it keep
 * their own records and simply stop being shown as living together.
 */
export async function setHouseholdArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  guard(actor);

  const changed = await db
    .update(households)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(households.id, id))
    .returning({ id: households.id });

  if (changed.length === 0) throw new InvalidInputError("households.error.missing");
}

/**
 * R2.1. Puts two halves of one family back together.
 *
 * Everybody in `fromId` moves to `intoId` and the empty one is archived. A
 * person already in the destination keeps the role they have there rather than
 * gaining a second membership of the same household.
 */
export async function mergeHouseholds(
  db: Tx,
  actor: WriteActor,
  fromId: string,
  intoId: string,
): Promise<{ moved: number }> {
  guard(actor);
  if (fromId === intoId) throw new InvalidInputError("households.error.sameOne");

  const [target] = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.id, intoId))
    .limit(1);
  if (!target) throw new InvalidInputError("households.error.missing");

  const already = await db
    .select({ memberId: householdMemberships.memberId })
    .from(householdMemberships)
    .where(eq(householdMemberships.householdId, intoId));
  const held = new Set(already.map((row) => row.memberId));

  const coming = await db
    .select({ id: householdMemberships.id, memberId: householdMemberships.memberId })
    .from(householdMemberships)
    .where(eq(householdMemberships.householdId, fromId));

  let moved = 0;
  for (const row of coming) {
    if (held.has(row.memberId)) {
      await db.delete(householdMemberships).where(eq(householdMemberships.id, row.id));
      continue;
    }
    await db
      .update(householdMemberships)
      .set({ householdId: intoId })
      .where(eq(householdMemberships.id, row.id));
    moved += 1;
  }

  await db
    .update(households)
    .set({ archivedAt: new Date() })
    .where(and(eq(households.id, fromId), isNull(households.archivedAt)));

  return { moved };
}
