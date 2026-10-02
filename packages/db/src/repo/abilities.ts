/**
 * R2.9. Skills, interests and spiritual gifts.
 *
 * The point of all three is one question, asked when a church is short of
 * somebody: who can do this. So the list is managed by the church rather than
 * typed free, and the read that matters is `peopleWith`.
 */
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { abilities, personAbilities, ABILITY_KINDS, type AbilityKind } from "../schema/abilities";
import { people } from "../schema/people";
import { InvalidInputError, NameTakenError } from "../errors";
import { PermissionError, canEditPeople, type TenantRole } from "../roles";
import { canManageChurch } from "./church";

export { ABILITY_KINDS, type AbilityKind };

export interface WriteActor {
  tenantId: string;
  role: TenantRole;
  userId?: string;
}

export interface Ability {
  id: string;
  kind: AbilityKind;
  name: string;
  /** How many people in the church have it. */
  count: number;
  archivedAt: Date | null;
}

const clean = (name: string): string => name.trim().replace(/\s+/g, " ");

const isKind = (value: string): value is AbilityKind =>
  (ABILITY_KINDS as readonly string[]).includes(value);

/** R2.9. The church's own three lists, with how many people are on each entry. */
export async function listAbilities(
  db: Tx,
  opts: { kind?: AbilityKind; includeArchived?: boolean } = {},
): Promise<Ability[]> {
  const rows = await db
    .select({
      id: abilities.id,
      kind: abilities.kind,
      name: abilities.name,
      archivedAt: abilities.archivedAt,
      count: sql<number>`(
        select count(*)::int from person_abilities pa
        join people p on p.id = pa.person_id and p.archived_at is null
        where pa.ability_id = abilities.id
      )`,
    })
    .from(abilities)
    .where(
      and(
        opts.kind ? eq(abilities.kind, opts.kind) : undefined,
        opts.includeArchived ? undefined : isNull(abilities.archivedAt),
      ),
    )
    .orderBy(asc(abilities.kind), asc(abilities.name));

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as AbilityKind,
    name: row.name,
    count: row.count,
    archivedAt: row.archivedAt,
  }));
}

/** R2.9. Adding to one of the three lists. */
export async function addAbility(
  db: Tx,
  actor: WriteActor,
  input: { kind: string; name: string },
): Promise<Ability> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");
  if (!isKind(input.kind)) throw new InvalidInputError("ability.error.kind");

  const name = clean(input.name);
  if (!name) throw new InvalidInputError("ability.error.name");
  if (name.length > 60) throw new InvalidInputError("ability.error.nameLong");

  const [taken] = await db
    .select({ id: abilities.id })
    .from(abilities)
    .where(and(eq(abilities.kind, input.kind), sql`lower(${abilities.name}) = lower(${name})`))
    .limit(1);
  if (taken) throw new NameTakenError("ability.error.taken", name, taken.id);

  const [row] = await db
    .insert(abilities)
    .values({ tenantId: actor.tenantId, kind: input.kind, name })
    .returning({ id: abilities.id });

  return { id: row!.id, kind: input.kind, name, count: 0, archivedAt: null };
}

export async function renameAbility(
  db: Tx,
  actor: WriteActor,
  input: { id: string; name: string },
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const name = clean(input.name);
  if (!name) throw new InvalidInputError("ability.error.name");

  const [row] = await db
    .select({ kind: abilities.kind })
    .from(abilities)
    .where(eq(abilities.id, input.id))
    .limit(1);
  if (!row) throw new InvalidInputError("ability.error.missing");

  const [taken] = await db
    .select({ id: abilities.id })
    .from(abilities)
    .where(
      and(
        eq(abilities.kind, row.kind),
        sql`lower(${abilities.name}) = lower(${name})`,
        sql`${abilities.id} <> ${input.id}`,
      ),
    )
    .limit(1);
  if (taken) throw new NameTakenError("ability.error.taken", name, taken.id);

  await db.update(abilities).set({ name }).where(eq(abilities.id, input.id));
}

/**
 * R2.9. Taking an entry off the list.
 *
 * Archived rather than deleted, because somebody who was recorded as a driver
 * two years ago was a driver two years ago, and a church rewriting its own
 * vocabulary should not rewrite what it knew.
 */
export async function setAbilityArchived(
  db: Tx,
  actor: WriteActor,
  input: { id: string; archived: boolean },
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");
  await db
    .update(abilities)
    .set({ archivedAt: input.archived ? new Date() : null })
    .where(eq(abilities.id, input.id));
}

/** What this person has, across all three lists. */
export async function abilitiesForPerson(
  db: Tx,
  personId: string,
): Promise<{ id: string; kind: AbilityKind; name: string }[]> {
  const rows = await db
    .select({ id: abilities.id, kind: abilities.kind, name: abilities.name })
    .from(personAbilities)
    .innerJoin(abilities, eq(abilities.id, personAbilities.abilityId))
    .where(eq(personAbilities.personId, personId))
    .orderBy(asc(abilities.kind), asc(abilities.name));

  return rows.map((row) => ({ id: row.id, kind: row.kind as AbilityKind, name: row.name }));
}

/** R2.9. Saying somebody has one, or no longer does. */
export async function setPersonAbility(
  db: Tx,
  actor: WriteActor,
  input: { personId: string; abilityId: string; on: boolean },
): Promise<void> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");

  if (!input.on) {
    await db
      .delete(personAbilities)
      .where(
        and(
          eq(personAbilities.personId, input.personId),
          eq(personAbilities.abilityId, input.abilityId),
        ),
      );
    return;
  }

  const [ability] = await db
    .select({ id: abilities.id })
    .from(abilities)
    .where(and(eq(abilities.id, input.abilityId), isNull(abilities.archivedAt)))
    .limit(1);
  if (!ability) throw new InvalidInputError("ability.error.missing");

  await db
    .insert(personAbilities)
    .values({
      tenantId: actor.tenantId,
      personId: input.personId,
      abilityId: input.abilityId,
    })
    .onConflictDoNothing();
}

/**
 * R2.9. Who can do this.
 *
 * The read the whole feature exists for. Several at once means everybody who
 * has all of them, because a church looking for a driver who is also checked
 * for children wants the overlap.
 */
export async function peopleWith(
  db: Tx,
  abilityIds: string[],
): Promise<string[]> {
  const ids = [...new Set(abilityIds)].filter(Boolean);
  if (ids.length === 0) return [];

  const rows = await db
    .select({ personId: personAbilities.personId })
    .from(personAbilities)
    .innerJoin(people, eq(people.id, personAbilities.personId))
    .where(and(inArray(personAbilities.abilityId, ids), isNull(people.archivedAt)))
    .groupBy(personAbilities.personId)
    .having(sql`count(distinct ${personAbilities.abilityId}) = ${ids.length}`);

  return rows.map((row) => row.personId);
}

/** The counts behind the settings screen, so a church sees what it is using. */
export async function abilityCount(db: Tx): Promise<number> {
  const [row] = await db.select({ n: count() }).from(abilities).where(isNull(abilities.archivedAt));
  return row?.n ?? 0;
}
