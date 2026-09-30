import { and, asc, eq, isNull, sql, count } from "drizzle-orm";
import type { Tx } from "../client";
import { people, households, householdMemberships, tags, personTags } from "../schema/people";

export interface PersonRow {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  displayName: string;
  lifecycleStatus: string;
  dateOfBirth: string | null;
  householdName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
}

/**
 * The directory query. No tenant filter appears here on purpose: row-level
 * security supplies it from the transaction's app.tenant_id, so forgetting one
 * returns nothing rather than returning another church's members.
 */
export async function listPeople(db: Tx, opts: { includeArchived?: boolean } = {}): Promise<PersonRow[]> {
  const rows = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      lifecycleStatus: people.lifecycleStatus,
      dateOfBirth: people.dateOfBirth,
      householdName: households.name,
      primaryEmail: sql<string | null>`(
        select cm.value from contact_methods cm
        where cm.person_id = ${people.id} and cm.kind = 'email' and cm.is_primary
        limit 1
      )`,
      primaryPhone: sql<string | null>`(
        select cm.value from contact_methods cm
        where cm.person_id = ${people.id} and cm.kind = 'phone' and cm.is_primary
        limit 1
      )`,
    })
    .from(people)
    .leftJoin(
      householdMemberships,
      and(eq(householdMemberships.personId, people.id), isNull(householdMemberships.endedOn)),
    )
    .leftJoin(households, eq(households.id, householdMemberships.householdId))
    .where(opts.includeArchived ? undefined : isNull(people.archivedAt))
    .orderBy(asc(people.lastName), asc(people.firstName));

  return rows.map((r) => ({
    ...r,
    displayName: `${r.preferredName ?? r.firstName} ${r.lastName}`,
  }));
}

export async function getPerson(db: Tx, id: string) {
  const [row] = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return row ?? null;
}

export async function countPeopleByStatus(db: Tx): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: people.lifecycleStatus, n: count() })
    .from(people)
    .where(isNull(people.archivedAt))
    .groupBy(people.lifecycleStatus);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

export async function listTags(db: Tx) {
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function listTagsForPerson(db: Tx, personId: string) {
  return db
    .select({ id: tags.id, name: tags.name, hue: tags.hue })
    .from(personTags)
    .innerJoin(tags, eq(tags.id, personTags.tagId))
    .where(eq(personTags.personId, personId));
}

/**
 * Resolves a church by slug using the owner connection.
 *
 * This is the one legitimate pre-authorization lookup: you cannot set a tenant
 * context before you know which tenant it is. In production the tenant comes
 * from the authenticated session and membership is verified before the context
 * is set. It lives here, named and documented, so that the rule "the web app
 * never imports the owner connection" stays true and testable.
 */
export async function resolveTenantBySlug(slug: string): Promise<{ id: string; name: string } | null> {
  const { owner } = await import("../client");
  const rows = await owner()<{ id: string; name: string }[]>`
    select id, name from tenants where slug = ${slug} limit 1`;
  return rows[0] ?? null;
}

export async function listChurches(): Promise<{ slug: string; name: string }[]> {
  const { owner } = await import("../client");
  return owner()<{ slug: string; name: string }[]>`select slug, name from tenants order by name`;
}
