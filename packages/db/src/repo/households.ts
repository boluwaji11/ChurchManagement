import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { households, householdMemberships } from "../schema/people";
import { PermissionError, canManageHouseholds } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";

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
  members: { id: string; name: string; role: string }[];
  archived: boolean;
}

function guard(actor: WriteActor): void {
  if (!canManageHouseholds(actor.role)) {
    throw new PermissionError(actor.role, "manageHouseholds");
  }
}

const clean = (raw: string): string => raw.trim().replace(/\s+/g, " ");

export async function listHouseholdRows(
  db: Tx,
  opts: { includeArchived?: boolean } = {},
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
                     coalesce(p.preferred_name, p.first_name) || ' ' || p.last_name as name,
                     hm.role::text as role
                from household_memberships hm
                join people p on p.id = hm.person_id
               where hm.household_id = households.id
                 and p.archived_at is null
            ) m
        ),
        '[]'::json
      )`,
    })
    .from(households)
    .where(opts.includeArchived ? undefined : isNull(households.archivedAt))
    .orderBy(asc(households.name));

  return rows.map(({ archivedAt, ...row }) => ({
    ...row,
    members: row.members ?? [],
    archived: archivedAt !== null,
  }));
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
 * Archived rather than deleted, like every other record. The people in it keep
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
    .select({ personId: householdMemberships.personId })
    .from(householdMemberships)
    .where(eq(householdMemberships.householdId, intoId));
  const held = new Set(already.map((row) => row.personId));

  const coming = await db
    .select({ id: householdMemberships.id, personId: householdMemberships.personId })
    .from(householdMemberships)
    .where(eq(householdMemberships.householdId, fromId));

  let moved = 0;
  for (const row of coming) {
    if (held.has(row.personId)) {
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
