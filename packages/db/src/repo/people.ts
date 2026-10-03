import { and, asc, desc, eq, inArray, isNull, sql, count, type SQL } from "drizzle-orm";
import type { Tx } from "../client";
import { people, households, householdMemberships, contactMethods, tags, personTags } from "../schema/people";
import { canArchivePeople, canEditPeople, PermissionError, type TenantRole } from "../roles";
import { visiblePeople, type Viewer } from "./scope";
import { requireRoomForPeople } from "./provisional";

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
  archivedAt: Date | null;
}

/**
 * The directory query. No tenant filter appears here on purpose: row-level
 * security supplies it from the transaction's app.tenant_id, so forgetting one
 * returns nothing rather than returning another church's members.
 */
/** How a directory query can be narrowed and ordered. */
export interface DirectoryQuery {
  includeArchived?: boolean;
  /** Matches a name, an email, or a phone number. */
  q?: string;
  status?: string;
  tagId?: string;
  /** "any" means no filter. */
  has?: "email" | "phone" | "noEmail" | "noPhone";
  sort?: "name" | "firstName" | "household" | "status" | "added";
  dir?: "asc" | "desc";
  /** Restricts to a set of ids, for acting on a selection. */
  ids?: string[];
  /**
   * R9.3. Who is asking. A group leader sees the people in the groups they
   * lead and nobody else, and that is decided here rather than in a page,
   * because a scope enforced by a template is not a scope.
   */
  viewer?: Viewer;
  /** One-based. Omitted means every matching row, which is what an export wants. */
  page?: number;
  perPage?: number;
}

/** How many rows a directory page holds. */
export const PER_PAGE = 50;

const ORDERS = {
  name: [people.lastName, people.firstName],
  firstName: [people.firstName, people.lastName],
  household: [households.name, people.lastName],
  status: [people.lifecycleStatus, people.lastName],
  added: [people.createdAt],
} as const;

/**
 * The directory query.
 *
 * No tenant filter appears here on purpose: row-level security supplies it from
 * the transaction's app.tenant_id, so forgetting one returns nothing rather than
 * returning another church's members.
 *
 * Searching, filtering and ordering happen in Postgres rather than in the page,
 * so the answer is the same whether a church has fifty people or five thousand,
 * and so a filtered export exports what the filter says rather than what one
 * page of it said.
 */
/**
 * The whole of what the search box and the filters mean, as SQL.
 *
 * Exported so the performance test can ask the database to explain exactly this
 * rather than a copy of it. A copy drifts, and then the number it reports is
 * about a query nobody runs. (R2.14)
 */
export function directoryWhere(opts: DirectoryQuery): (SQL | undefined)[] {
  const where: (SQL | undefined)[] = [];

  if (!opts.includeArchived) where.push(isNull(people.archivedAt));

  const q = (opts.q ?? "").trim();
  if (q) {
    // R2.14. One box, because a volunteer types what they remember and does not
    // know which field it was: part of a surname, the back half of a phone
    // number, a street off a returned letter.
    //
    // Digits are matched against phone numbers with their punctuation stripped,
    // so "5550148" finds "(512) 555-0148". Every one of these is a substring
    // match, which is why sql/search.sql puts a trigram index on each of them.
    const like = `%${q.toLowerCase()}%`;
    const digits = q.replace(/\D/g, "");
    const addressMatches = sql`
      lower(a.line1) like ${like}
      or lower(coalesce(a.line2, '')) like ${like}
      or lower(coalesce(a.city, '')) like ${like}
      or lower(coalesce(a.postal_code, '')) like ${like}`;
    where.push(sql`(
      lower(${people.firstName}) like ${like}
      or lower(${people.lastName}) like ${like}
      or lower(coalesce(${people.preferredName}, '')) like ${like}
      or lower(${people.firstName} || ' ' || ${people.lastName}) like ${like}
      or exists (
        select 1 from contact_methods cm
        where cm.person_id = ${people.id}
          and (
            lower(cm.value) like ${like}
            ${digits.length >= 3 ? sql`or regexp_replace(cm.value, '[^0-9]', '', 'g') like ${`%${digits}%`}` : sql``}
          )
      )
      or ${people.id} in (
        -- Their own address, or their household's, because a church writes one
        -- address for the family and looks a person up by it.
        --
        -- Written as a set rather than a correlated exists. As an exists, the
        -- planner ran it once per person: five thousand people, each scanning
        -- every address, which took 1.9 seconds. This runs once.
        select a.person_id from addresses a
         where a.person_id is not null and (${addressMatches})
        union
        select hm.person_id
          from addresses a
          join household_memberships hm on hm.household_id = a.household_id
         where a.household_id is not null and (${addressMatches})
      )
    )`);
  }

  if (opts.status) where.push(eq(people.lifecycleStatus, opts.status as never));

  if (opts.tagId) {
    where.push(sql`exists (
      select 1 from person_tags pt where pt.person_id = ${people.id} and pt.tag_id = ${opts.tagId}::uuid
    )`);
  }

  if (opts.has) {
    const kind = opts.has === "email" || opts.has === "noEmail" ? "email" : "phone";
    const present = sql`exists (
      select 1 from contact_methods cm where cm.person_id = ${people.id} and cm.kind = ${kind}
    )`;
    where.push(opts.has.startsWith("no") ? sql`not ${present}` : present);
  }

  if (opts.ids) where.push(opts.ids.length === 0 ? sql`false` : inArray(people.id, opts.ids));

  return where;
}

/**
 * The directory query.
 *
 * No tenant filter appears here on purpose: row-level security supplies it from
 * the transaction's app.tenant_id, so forgetting one returns nothing rather than
 * returning another church's members.
 */
export async function listPeople(db: Tx, opts: DirectoryQuery = {}): Promise<PersonRow[]> {
  const scoped = await scopeIds(db, opts);
  if (scoped !== null && scoped.length === 0) return [];
  const where = directoryWhere(scoped === null ? opts : { ...opts, ids: scoped });
  const columns = ORDERS[opts.sort ?? "name"] ?? ORDERS.name;
  const direction = opts.dir === "desc" ? desc : asc;

  const rows = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      lifecycleStatus: people.lifecycleStatus,
      dateOfBirth: people.dateOfBirth,
      archivedAt: people.archivedAt,
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
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(...columns.map((c) => direction(c)))
    .limit(opts.page ? (opts.perPage ?? PER_PAGE) : Number.MAX_SAFE_INTEGER)
    .offset(opts.page ? (opts.page - 1) * (opts.perPage ?? PER_PAGE) : 0);

  return rows.map((r) => ({
    ...r,
    displayName: `${r.preferredName ?? r.firstName} ${r.lastName}`,
  }));
}

export async function getPerson(db: Tx, id: string, viewer?: Viewer) {
  if (viewer) {
    const allowed = await visiblePeople(db, viewer);
    if (allowed !== null && !allowed.includes(id)) return null;
  }
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
 * One of the three documented pre-authorization operations: you cannot set a tenant
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

// ---------------------------------------------------------------------------
// Writes (HRT-21)
// ---------------------------------------------------------------------------

export const LIFECYCLE_STATUSES = [
  "visitor", "regular_attender", "member", "inactive", "deceased",
] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const HOUSEHOLD_ROLES = ["head", "spouse", "child", "other"] as const;
export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

/** Everything a write needs to know about who is asking. */
export interface WriteActor {
  tenantId: string;
  role: TenantRole;
  /**
   * The signed-in account, where the write is scoped to something this person
   * is part of. A team leader may change the schedule of the team they lead, and
   * that is the only way to know which team that is.
   */
  userId?: string | null;
}

export interface PersonInput {
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  lifecycleStatus: LifecycleStatus;
  membershipDate?: string | null;
  firstVisitOn?: string | null;
  email?: string | null;
  phone?: string | null;
  /** R8.10. Shown at check-in and printed on the child's label. */
  allergies?: string | null;
  medicalNote?: string | null;
  /** An existing household, or null for none. Ignored when householdName is set. */
  householdId?: string | null;
  /** Creates a household with this name and puts the person in it. */
  householdName?: string | null;
  householdRole?: HouseholdRole;
}

const trimmed = (v: string | null | undefined): string | null => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};

/**
 * R2.1 and R2.3. Creates a person, their primary email and phone, and their
 * household membership, in one transaction.
 *
 * tenant_id is written explicitly even though row-level security would reject a
 * row belonging to anyone else. The policy is the control; passing the value is
 * how the row gets one at all.
 */
export async function createPerson(db: Tx, actor: WriteActor, input: PersonInput): Promise<{ id: string }> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "addPerson");
  // R1.1. A church nobody has looked at yet holds a congregation's worth of
  // nothing. Checked here rather than on a screen, because an import adds four
  // hundred at once and a screen is not where that happens.
  await requireRoomForPeople(db, actor.tenantId);

  const [row] = await db
    .insert(people)
    .values({
      tenantId: actor.tenantId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      preferredName: trimmed(input.preferredName),
      dateOfBirth: trimmed(input.dateOfBirth),
      lifecycleStatus: input.lifecycleStatus,
      membershipDate: trimmed(input.membershipDate),
      firstVisitOn: trimmed(input.firstVisitOn),
      allergies: trimmed(input.allergies),
      medicalNote: trimmed(input.medicalNote),
    })
    .returning({ id: people.id });

  if (!row) throw new Error("Person insert returned no row.");

  await setContact(db, actor, row.id, "email", input.email);
  await setContact(db, actor, row.id, "phone", input.phone);
  await setHousehold(db, actor, row.id, input);

  return row;
}

/**
 * R2.3 and R2.5. Updates a person in place.
 *
 * No tenant predicate appears in the where clause. Row-level security supplies
 * it, so an id belonging to another church updates zero rows rather than
 * updating theirs. The affected count is checked so a caller cannot mistake
 * "not yours" for "saved".
 */
export async function updatePerson(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: PersonInput,
): Promise<void> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");

  const changed = await db
    .update(people)
    .set({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      preferredName: trimmed(input.preferredName),
      dateOfBirth: trimmed(input.dateOfBirth),
      lifecycleStatus: input.lifecycleStatus,
      membershipDate: trimmed(input.membershipDate),
      firstVisitOn: trimmed(input.firstVisitOn),
      allergies: trimmed(input.allergies),
      medicalNote: trimmed(input.medicalNote),
      updatedAt: new Date(),
    })
    .where(eq(people.id, id))
    .returning({ id: people.id });

  if (changed.length === 0) throw new Error("No such person.");

  await setContact(db, actor, id, "email", input.email);
  await setContact(db, actor, id, "phone", input.phone);
  await setHousehold(db, actor, id, input);
}

/**
 * R2.13. Archive, never hard delete.
 *
 * An archived person leaves every list and keeps every record: their giving
 * history, their attendance, the note a pastor wrote in 2019. True deletion
 * happens only through the DSAR path, which is a different feature with a
 * different audit trail.
 */
export async function setPersonArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canArchivePeople(actor.role)) {
    throw new PermissionError(actor.role, archived ? "archivePerson" : "restorePerson");
  }

  const changed = await db
    .update(people)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(people.id, id))
    .returning({ id: people.id });

  if (changed.length === 0) throw new Error("No such person.");
}

/**
 * One primary contact method per kind, edited in place.
 *
 * Updating rather than deleting and reinserting keeps the audit log readable: a
 * corrected phone number reads as one update with a before and an after, not as
 * a deletion followed by an unrelated-looking insert.
 */
async function setContact(
  db: Tx,
  actor: WriteActor,
  personId: string,
  kind: "email" | "phone",
  value: string | null | undefined,
): Promise<void> {
  const next = trimmed(value);

  const [existing] = await db
    .select({ id: contactMethods.id })
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.personId, personId),
        eq(contactMethods.kind, kind),
        eq(contactMethods.isPrimary, true),
      ),
    )
    .limit(1);

  if (!next) {
    if (existing) await db.delete(contactMethods).where(eq(contactMethods.id, existing.id));
    return;
  }

  if (existing) {
    await db.update(contactMethods).set({ value: next }).where(eq(contactMethods.id, existing.id));
    return;
  }

  await db.insert(contactMethods).values({
    tenantId: actor.tenantId,
    personId,
    kind,
    label: kind === "phone" ? "mobile" : "home",
    value: next,
    isPrimary: true,
  });
}

/**
 * R2.2. Puts a person in a household, creating it if the form named a new one.
 *
 * Membership is ended by date rather than deleted, because household history is
 * the thing that explains a record. A child who moved out still attended with
 * their parents for eleven years.
 */
async function setHousehold(db: Tx, actor: WriteActor, personId: string, input: PersonInput): Promise<void> {
  const role = input.householdRole ?? "other";
  const newName = trimmed(input.householdName);

  let targetId: string | null = null;
  if (newName) {
    const [household] = await db
      .insert(households)
      .values({ tenantId: actor.tenantId, name: newName })
      .returning({ id: households.id });
    if (!household) throw new Error("Household insert returned no row.");
    targetId = household.id;
  } else if (input.householdId) {
    targetId = input.householdId;
  }

  const [current] = await db
    .select({ id: householdMemberships.id, householdId: householdMemberships.householdId })
    .from(householdMemberships)
    .where(and(eq(householdMemberships.personId, personId), isNull(householdMemberships.endedOn)))
    .limit(1);

  if (current && current.householdId === targetId) {
    await db.update(householdMemberships).set({ role }).where(eq(householdMemberships.id, current.id));
    return;
  }

  if (current) {
    await db
      .update(householdMemberships)
      .set({ endedOn: new Date().toISOString().slice(0, 10) })
      .where(eq(householdMemberships.id, current.id));
  }

  if (targetId) {
    await db.insert(householdMemberships).values({
      tenantId: actor.tenantId,
      householdId: targetId,
      personId,
      role,
      startedOn: new Date().toISOString().slice(0, 10),
    });
  }
}

export interface PersonEditValues extends PersonInput {
  id: string;
  archivedAt: Date | null;
}

/** Everything the edit form needs, shaped the way the form holds it. */
export async function getPersonForEdit(db: Tx, id: string): Promise<PersonEditValues | null> {
  const person = await getPerson(db, id);
  if (!person) return null;

  const contacts = await db
    .select({ kind: contactMethods.kind, value: contactMethods.value })
    .from(contactMethods)
    .where(and(eq(contactMethods.personId, id), eq(contactMethods.isPrimary, true)));

  const [membership] = await db
    .select({ householdId: householdMemberships.householdId, role: householdMemberships.role })
    .from(householdMemberships)
    .where(and(eq(householdMemberships.personId, id), isNull(householdMemberships.endedOn)))
    .limit(1);

  return {
    id: person.id,
    archivedAt: person.archivedAt,
    firstName: person.firstName,
    lastName: person.lastName,
    preferredName: person.preferredName,
    dateOfBirth: person.dateOfBirth,
    lifecycleStatus: person.lifecycleStatus as LifecycleStatus,
    membershipDate: person.membershipDate,
    firstVisitOn: person.firstVisitOn,
    allergies: person.allergies,
    medicalNote: person.medicalNote,
    email: contacts.find((c) => c.kind === "email")?.value ?? null,
    phone: contacts.find((c) => c.kind === "phone")?.value ?? null,
    householdId: membership?.householdId ?? null,
    householdRole: (membership?.role as HouseholdRole | undefined) ?? "other",
  };
}

export async function listHouseholds(db: Tx): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: households.id, name: households.name })
    .from(households)
    .where(isNull(households.archivedAt))
    .orderBy(asc(households.name));
}

/**
 * R2.12. Acting on a selection.
 *
 * Every one of these takes explicit ids rather than a filter. A bulk action
 * driven by "whatever the filter matched" does something different from what the
 * person was looking at the moment anything changes underneath them, and the
 * thing they were looking at is the thing they meant.
 *
 * The count of rows actually changed is returned, not the count asked for. An id
 * belonging to another church updates nothing, and the caller is told the truth
 * about that rather than a number that flatters it.
 */
export async function bulkSetArchived(
  db: Tx,
  actor: WriteActor,
  ids: string[],
  archived: boolean,
): Promise<number> {
  if (!canArchivePeople(actor.role)) {
    throw new PermissionError(actor.role, archived ? "archivePerson" : "restorePerson");
  }
  if (ids.length === 0) return 0;

  const changed = await db
    .update(people)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(inArray(people.id, ids))
    .returning({ id: people.id });

  return changed.length;
}

export async function bulkSetStatus(
  db: Tx,
  actor: WriteActor,
  ids: string[],
  status: LifecycleStatus,
): Promise<number> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");
  if (ids.length === 0) return 0;

  const changed = await db
    .update(people)
    .set({ lifecycleStatus: status, updatedAt: new Date() })
    .where(inArray(people.id, ids))
    .returning({ id: people.id });

  return changed.length;
}

/**
 * How many people match, ignoring the page.
 *
 * A separate count rather than a window function on the page query, because the
 * page query joins households to sort by them and a count over that join would
 * have to be made distinct. Two simple queries beat one clever one here.
 */
/**
 * R9.3. The ids a viewer may see, crossed with the ids they asked for.
 *
 * Null means no restriction. An empty array means nobody, which is what a group
 * leader who leads nothing gets, and the caller returns an empty page rather
 * than every person in the church.
 */
async function scopeIds(db: Tx, opts: DirectoryQuery): Promise<string[] | null> {
  if (!opts.viewer) return opts.ids ?? null;

  const allowed = await visiblePeople(db, opts.viewer);
  if (allowed === null) return opts.ids ?? null;
  if (!opts.ids) return allowed;
  return opts.ids.filter((id) => allowed.includes(id));
}

export async function countPeople(db: Tx, opts: DirectoryQuery = {}): Promise<number> {
  const scoped = await scopeIds(db, opts);
  if (scoped !== null && scoped.length === 0) return 0;
  const where = directoryWhere(scoped === null ? opts : { ...opts, ids: scoped });
  const rows = await db
    .select({ n: count() })
    .from(people)
    .where(where.length > 0 ? and(...where) : undefined);
  return Number(rows[0]?.n ?? 0);
}
