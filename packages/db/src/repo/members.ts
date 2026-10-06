import { and, asc, desc, eq, inArray, isNull, or, sql, count, type SQL } from "drizzle-orm";
import type { Tx } from "../client";
import { freeSlug } from "./slugs";
import { isUuid } from "./form-rules";
import type { Permission } from "../permissions";
import { members, households, householdMemberships, contactMethods, addresses, tags, memberTags, milestones } from "../schema/members";
import { canArchivePeople, canEditPeople, PermissionError, type TenantRole } from "../roles";
import { visiblePeople, type Viewer } from "./scope";
import { requireRoomForPeople } from "./provisional";
import { InvalidInputError } from "../errors";

export interface PersonRow {
  id: string;
  /** R24.6. The readable part of their address. */
  slug: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  displayName: string;
  lifecycleStatus: string;
  dateOfBirth: string | null;
  householdName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  /** R2.14. The tag names, for the column the directory shows them in. */
  tagNames: string[];
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
  /** R2.4. When they became a member, in the buckets a church asks in. */
  joined?: "year" | "five" | "earlier";
  /** R2.4. No email and no phone, which is a person nobody can reach. */
  missing?: boolean;
  /** R9.x. In a group, or in none. */
  group?: "any" | "none";
  /** R10.x. On a serving team, or on none. */
  serving?: "any" | "none";
  /** R7.x. Seen at a service in the last few weeks, or not seen. */
  seen?: "recent" | "absent";
  sort?: "name" | "firstName" | "household" | "status" | "added";
  dir?: "asc" | "desc";
  /** Restricts to a set of ids, for acting on a selection. */
  ids?: string[];
  /**
   * R9.3. Who is asking. A group leader sees the members in the groups they
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
  name: [members.lastName, members.firstName],
  firstName: [members.firstName, members.lastName],
  household: [households.name, members.lastName],
  status: [members.lifecycleStatus, members.lastName],
  added: [members.createdAt],
} as const;

/**
 * The directory query.
 *
 * No tenant filter appears here on purpose: row-level security supplies it from
 * the transaction's app.tenant_id, so forgetting one returns nothing rather than
 * returning another church's members.
 *
 * Searching, filtering and ordering happen in Postgres rather than in the page,
 * so the answer is the same whether a church has fifty members or five thousand,
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

  if (!opts.includeArchived) where.push(isNull(members.archivedAt));

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
      lower(${members.firstName}) like ${like}
      or lower(${members.lastName}) like ${like}
      or lower(coalesce(${members.preferredName}, '')) like ${like}
      or lower(${members.firstName} || ' ' || ${members.lastName}) like ${like}
      or exists (
        select 1 from contact_methods cm
        where cm.member_id = ${members.id}
          and (
            lower(cm.value) like ${like}
            ${digits.length >= 3 ? sql`or regexp_replace(cm.value, '[^0-9]', '', 'g') like ${`%${digits}%`}` : sql``}
          )
      )
      or ${members.id} in (
        -- Their own address, or their household's, because a church writes one
        -- address for the family and looks a person up by it.
        --
        -- Written as a set rather than a correlated exists. As an exists, the
        -- planner ran it once per person: five thousand members, each scanning
        -- every address, which took 1.9 seconds. This runs once.
        select a.member_id from addresses a
         where a.member_id is not null and (${addressMatches})
        union
        select hm.member_id
          from addresses a
          join household_memberships hm on hm.household_id = a.household_id
         where a.household_id is not null and (${addressMatches})
      )
    )`);
  }

  if (opts.status) where.push(eq(members.lifecycleStatus, opts.status as never));

  if (opts.tagId) {
    where.push(sql`exists (
      select 1 from member_tags pt where pt.member_id = ${members.id} and pt.tag_id = ${opts.tagId}::uuid
    )`);
  }

  if (opts.has) {
    const kind = opts.has === "email" || opts.has === "noEmail" ? "email" : "phone";
    const present = sql`exists (
      select 1 from contact_methods cm where cm.member_id = ${members.id} and cm.kind = ${kind}
    )`;
    where.push(opts.has.startsWith("no") ? sql`not ${present}` : present);
  }

  /*
   * R2.4. Joined, in the three buckets a church asks in. Compared against the
   * database's own date rather than one the caller passed, so a saved list says
   * the same thing in January as it did in December.
   */
  if (opts.joined === "year") {
    where.push(sql`${members.membershipDate} >= date_trunc('year', current_date)`);
  } else if (opts.joined === "five") {
    where.push(sql`${members.membershipDate} >= (current_date - interval '5 years')`);
  } else if (opts.joined === "earlier") {
    where.push(sql`${members.membershipDate} < (current_date - interval '5 years')`);
  }

  /*
   * R2.4. Nobody can reach them. Either half missing is enough: an address on
   * its own is not a way to ask somebody how they are.
   */
  if (opts.missing) {
    where.push(sql`(
      not exists (select 1 from contact_methods cm where cm.member_id = ${members.id} and cm.kind = 'email')
      or not exists (select 1 from contact_methods cm where cm.member_id = ${members.id} and cm.kind = 'phone')
    )`);
  }

  // R9.5. In a group, or in none. The question behind the assimilation screen:
  // somebody who comes and belongs to nothing.
  if (opts.group) {
    const inAny = sql`exists (
      select 1 from group_memberships gm
       where gm.member_id = ${members.id} and gm.left_on is null
    )`;
    where.push(opts.group === "any" ? inAny : sql`not ${inAny}`);
  }

  // R10.1. On a team. Counted from the team's roll rather than from a schedule, so
  // somebody between rotas still counts as serving.
  if (opts.serving) {
    const onAny = sql`exists (
      select 1 from team_members tm
       where tm.member_id = ${members.id} and tm.left_on is null
    )`;
    where.push(opts.serving === "any" ? onAny : sql`not ${onAny}`);
  }

  /*
   * R7.5. Seen lately. Counted from the attendance record each time rather than
   * from a flag, for the reason R7.5 gives: a flag is wrong the moment somebody
   * corrects a mistake or imports a year of history.
   */
  if (opts.seen) {
    const lately = sql`exists (
      select 1 from attendance_records ar
        join service_occurrences so on so.id = ar.occurrence_id
       where ar.member_id = ${members.id}
         and so.occurs_on >= (current_date - interval '28 days')
    )`;
    where.push(opts.seen === "recent" ? lately : sql`not ${lately}`);
  }

  if (opts.ids) where.push(opts.ids.length === 0 ? sql`false` : inArray(members.id, opts.ids));

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
      id: members.id,
      slug: members.slug,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
      lifecycleStatus: members.lifecycleStatus,
      dateOfBirth: members.dateOfBirth,
      archivedAt: members.archivedAt,
      householdName: households.name,
      primaryEmail: sql<string | null>`(
        select cm.value from contact_methods cm
        where cm.member_id = ${members.id} and cm.kind = 'email' and cm.is_primary
        limit 1
      )`,
      primaryPhone: sql<string | null>`(
        select cm.value from contact_methods cm
        where cm.member_id = ${members.id} and cm.kind = 'phone' and cm.is_primary
        limit 1
      )`,
      // R2.14. One aggregate rather than a second round trip per person.
      tagNames: sql<string[]>`(
        select coalesce(array_agg(tg.name order by tg.name), '{}')
        from member_tags pt
        join tags tg on tg.id = pt.tag_id
        where pt.member_id = ${members.id}
      )`,
    })
    .from(members)
    .leftJoin(
      householdMemberships,
      and(eq(householdMemberships.memberId, members.id), isNull(householdMemberships.endedOn)),
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
  // R24.6. Found by their readable address or by their id. Read first, then
  // checked, because what a viewer may see is a question about the record.
  const [row] = await db
    .select()
    .from(members)
    .where(isUuid(id) ? eq(members.id, id) : eq(members.slug, id))
    .limit(1);
  if (!row) return null;

  if (viewer) {
    const allowed = await visiblePeople(db, viewer);
    if (allowed !== null && !allowed.includes(row.id)) return null;
  }
  return row;
}

export async function countPeopleByStatus(db: Tx): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: members.lifecycleStatus, n: count() })
    .from(members)
    .where(isNull(members.archivedAt))
    .groupBy(members.lifecycleStatus);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

export async function listTags(db: Tx) {
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function listTagsForPerson(db: Tx, memberId: string) {
  return db
    .select({ id: tags.id, name: tags.name, hue: tags.hue })
    .from(memberTags)
    .innerJoin(tags, eq(tags.id, memberTags.tagId))
    .where(eq(memberTags.memberId, memberId));
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
  /**
   * R1.6. The permissions this actor holds, for somebody on a role their church
   * wrote. Absent means the built-in role above, which the matrix answers.
   */
  permissions?: readonly Permission[] | null;
}

export interface AddressInput {
  line1: string | null;
  line2?: string | null;
  city?: string | null;
  /** The state, province or county, by whatever the country calls it. */
  region?: string | null;
  postalCode?: string | null;
  /** ISO 3166-1 alpha-2. Defaults to US, which is what the column does. */
  country?: string | null;
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
  /**
   * R2.4. Where they live.
   *
   * The parts, because a church running a mail merge needs the city, the state
   * and the postcode as their own answers. A plain string is still accepted,
   * split on its first comma, for the importers that only have one line.
   */
  address?: string | AddressInput | null;
  /** R1.2. Which campus they belong to. Null where the church has one. */
  campusId?: string | null;
  /** R2.1. Single, married, widowed, and so on. */
  maritalStatus?: string | null;
  /** R2.1. Pre-K through graduate school, from the managed list. */
  schoolLevel?: string | null;
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


/** R24.6. The readable part of a person's address, free within this church. */
async function freePersonSlug(
  db: Tx,
  first: string | null | undefined,
  last: string,
): Promise<string> {
  return freeSlug(
    [first, last].filter(Boolean).join(" "),
    async (candidate) => {
      const [clash] = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.slug, candidate))
        .limit(1);
      return Boolean(clash);
    },
    "person",
  );
}

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
    .insert(members)
    .values({
      tenantId: actor.tenantId,
      slug: await freePersonSlug(db, input.preferredName || input.firstName, input.lastName),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      preferredName: trimmed(input.preferredName),
      dateOfBirth: trimmed(input.dateOfBirth),
      lifecycleStatus: input.lifecycleStatus,
      membershipDate: trimmed(input.membershipDate),
      firstVisitOn: trimmed(input.firstVisitOn),
      allergies: trimmed(input.allergies),
      medicalNote: trimmed(input.medicalNote),
      campusId: trimmed(input.campusId),
      maritalStatus: trimmed(input.maritalStatus),
      schoolLevel: trimmed(input.schoolLevel),
    })
    .returning({ id: members.id });

  if (!row) throw new Error("Person insert returned no row.");

  await setContact(db, actor, row.id, "email", input.email);
  await setContact(db, actor, row.id, "phone", input.phone);
  await setAddress(db, actor, row.id, input.address);
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
    .update(members)
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
      campusId: trimmed(input.campusId),
      maritalStatus: trimmed(input.maritalStatus),
      schoolLevel: trimmed(input.schoolLevel),
      updatedAt: new Date(),
    })
    .where(eq(members.id, id))
    .returning({ id: members.id });

  if (changed.length === 0) throw new Error("No such person.");

  await setContact(db, actor, id, "email", input.email);
  await setContact(db, actor, id, "phone", input.phone);
  await setAddress(db, actor, id, input.address);
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
    .update(members)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(members.id, id))
    .returning({ id: members.id });

  if (changed.length === 0) throw new Error("No such person.");
}

/**
 * One primary contact method per kind, edited in place.
 *
 * Updating rather than deleting and reinserting keeps the audit log readable: a
 * corrected phone number reads as one update with a before and an after, not as
 * a deletion followed by an unrelated-looking insert.
 */
/**
 * R2.4. The address, written as one line.
 *
 * A church types "4412 N Kedzie Ave, Chicago IL 60625" and should not be asked
 * to break it into five boxes first. The first comma-separated part is the
 * street and the rest is the town, which is enough to print an envelope and
 * enough to find somebody by. Undefined leaves whatever is there alone; an
 * empty string takes it off.
 */
async function setAddress(
  db: Tx,
  actor: WriteActor,
  memberId: string,
  value: string | AddressInput | null | undefined,
): Promise<void> {
  if (value === undefined) return;

  const [existing] = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.memberId, memberId))
    .limit(1);

  // A string is one line from an importer: everything before the first comma is
  // the street and the rest is the city, which is the most that can be read out
  // of it honestly.
  const parts: AddressInput =
    typeof value === "string" || value === null
      ? (() => {
          const line = trimmed(value);
          if (!line) return { line1: null };
          const [first, ...rest] = line.split(",").map((part) => part.trim());
          return { line1: first ?? null, city: rest.join(", ") || null };
        })()
      : value;

  const line1 = trimmed(parts.line1);
  if (!line1) {
    if (existing) await db.delete(addresses).where(eq(addresses.id, existing.id));
    return;
  }

  const row = {
    line1,
    line2: trimmed(parts.line2),
    city: trimmed(parts.city),
    region: trimmed(parts.region),
    postalCode: trimmed(parts.postalCode),
    country: trimmed(parts.country) ?? "US",
  };

  if (existing) {
    await db.update(addresses).set(row).where(eq(addresses.id, existing.id));
    return;
  }

  await db.insert(addresses).values({
    tenantId: actor.tenantId,
    memberId,
    ...row,
    isPrimary: true,
  });
}

/** R2.4. The parts of somebody's own address, for a form that edits them. */
export async function addressPartsFor(db: Tx, memberId: string): Promise<AddressInput> {
  const [row] = await db
    .select({
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      region: addresses.region,
      postalCode: addresses.postalCode,
      country: addresses.country,
    })
    .from(addresses)
    .where(eq(addresses.memberId, memberId))
    .limit(1);

  return row ?? { line1: null };
}

async function setContact(
  db: Tx,
  actor: WriteActor,
  memberId: string,
  kind: "email" | "phone",
  value: string | null | undefined,
): Promise<void> {
  /*
   * R2.4. Not asked is not the same as cleared.
   *
   * The edit form no longer carries a single box for these, because the record
   * holds a list of them. A form that says nothing about an email must leave
   * the list exactly as it is, where an empty box means take it off.
   */
  if (value === undefined) return;

  const next = trimmed(value);

  const [existing] = await db
    .select({ id: contactMethods.id })
    .from(contactMethods)
    .where(
      and(
        eq(contactMethods.memberId, memberId),
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
    memberId,
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
async function setHousehold(db: Tx, actor: WriteActor, memberId: string, input: PersonInput): Promise<void> {
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
    .where(and(eq(householdMemberships.memberId, memberId), isNull(householdMemberships.endedOn)))
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
      memberId,
      role,
      startedOn: new Date().toISOString().slice(0, 10),
    });
  }
}

export interface PersonEditValues extends PersonInput {
  id: string;
  /** R24.6. The readable part of their address, for a link back. */
  slug: string;
  archivedAt: Date | null;
}

/** Everything the edit form needs, shaped the way the form holds it. */
export async function getPersonForEdit(db: Tx, id: string): Promise<PersonEditValues | null> {
  const person = await getPerson(db, id);
  if (!person) return null;

  // Found by slug or by id, so the rest reads from the record's own id.
  const memberId = person.id;

  const contacts = await db
    .select({ kind: contactMethods.kind, value: contactMethods.value })
    .from(contactMethods)
    .where(and(eq(contactMethods.memberId, memberId), eq(contactMethods.isPrimary, true)));

  const [membership] = await db
    .select({ householdId: householdMemberships.householdId, role: householdMemberships.role })
    .from(householdMemberships)
    .where(and(eq(householdMemberships.memberId, memberId), isNull(householdMemberships.endedOn)))
    .limit(1);

  return {
    id: person.id,
    slug: person.slug,
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
    campusId: person.campusId,
    maritalStatus: person.maritalStatus,
    schoolLevel: person.schoolLevel,
    address: await addressPartsFor(db, memberId),
    email: contacts.find((c) => c.kind === "email")?.value ?? null,
    phone: contacts.find((c) => c.kind === "phone")?.value ?? null,
    householdId: membership?.householdId ?? null,
    householdRole: (membership?.role as HouseholdRole | undefined) ?? "other",
  };
}

/**
 * R2.1. Every household, and who is in it.
 *
 * A church of 180 has four households called Smith, and a list of four
 * identical words is a list nobody can pick from. The names of the members in
 * each one come back with it, so "Smith" and "Smith" read as "Smith, Mike and
 * Jane" and "Smith, John".
 */
export interface HouseholdOption {
  id: string;
  name: string;
  /** Who is in it, so two households called Smith can be told apart. */
  members: { id: string; slug: string; name: string; role: string }[];
}

export async function listHouseholds(db: Tx): Promise<HouseholdOption[]> {
  const rows = await db
    .select({
      id: households.id,
      name: households.name,
      members: sql<HouseholdOption["members"]>`coalesce(
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
    .where(isNull(households.archivedAt))
    .orderBy(asc(households.name));

  return rows.map((row) => ({ ...row, members: row.members ?? [] }));
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
    .update(members)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(inArray(members.id, ids))
    .returning({ id: members.id });

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
    .update(members)
    .set({ lifecycleStatus: status, updatedAt: new Date() })
    .where(inArray(members.id, ids))
    .returning({ id: members.id });

  return changed.length;
}

/**
 * How many members match, ignoring the page.
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
    .from(members)
    .where(where.length > 0 ? and(...where) : undefined);
  return Number(rows[0]?.n ?? 0);
}

export interface HouseholdCard {
  id: string;
  name: string;
  members: { id: string; displayName: string; role: string }[];
}

/**
 * R2.4. The household a person belongs to, and who else is in it.
 *
 * The person's own page shows it, so the person asking is holding one record
 * and wants the family around it: who the spouse is, how many children, who to
 * ring if this one does not answer.
 */
export async function householdFor(db: Tx, memberId: string): Promise<HouseholdCard | null> {
  const [mine] = await db
    .select({ householdId: householdMemberships.householdId })
    .from(householdMemberships)
    .where(and(eq(householdMemberships.memberId, memberId), isNull(householdMemberships.endedOn)))
    .limit(1);
  if (!mine?.householdId) return null;

  const [household] = await db
    .select({ id: households.id, name: households.name })
    .from(households)
    .where(eq(households.id, mine.householdId))
    .limit(1);
  if (!household) return null;

  const household_members = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
      role: householdMemberships.role,
    })
    .from(householdMemberships)
    .innerJoin(members, eq(members.id, householdMemberships.memberId))
    .where(
      and(
        eq(householdMemberships.householdId, mine.householdId),
        isNull(householdMemberships.endedOn),
        isNull(members.archivedAt),
      ),
    )
    .orderBy(asc(members.lastName), asc(members.firstName));

  return {
    id: household.id,
    name: household.name,
    members: household_members.map((m: typeof household_members[number]) => ({
      id: m.id,
      displayName: `${m.preferredName ?? m.firstName} ${m.lastName}`,
      role: m.role,
    })),
  };
}

/**
 * R2.4. The address to put on an envelope.
 *
 * Their own if they have one, otherwise the household's, because a church
 * writes one address for the family and the person's page should still show it.
 */
export async function addressFor(db: Tx, memberId: string): Promise<string | null> {
  const [mine] = await db
    .select({ householdId: householdMemberships.householdId })
    .from(householdMemberships)
    .where(and(eq(householdMemberships.memberId, memberId), isNull(householdMemberships.endedOn)))
    .limit(1);

  const rows = await db
    .select({
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      region: addresses.region,
      postalCode: addresses.postalCode,
      memberId: addresses.memberId,
    })
    .from(addresses)
    .where(
      mine?.householdId
        ? or(eq(addresses.memberId, memberId), eq(addresses.householdId, mine.householdId))
        : eq(addresses.memberId, memberId),
    );

  // Their own wins over the household's.
  const row = rows.find((r) => r.memberId === memberId) ?? rows[0];
  return row ? oneLine(row) : null;
}

interface AddressParts {
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
}

/** An address on one line, the way it reads on an envelope. */
function oneLine(row: AddressParts): string {
  const town = [row.city, row.region].filter(Boolean).join(" ");
  return [row.line1, row.line2, [town, row.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

/**
 * R2.11. The same answer for a list of members, in two queries.
 *
 * The card list prints an address against every name on it, and a month of
 * birthdays is thirty names.
 */
export async function addressesFor(
  db: Tx,
  personIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (personIds.length === 0) return out;

  const memberships = await db
    .select({
      memberId: householdMemberships.memberId,
      householdId: householdMemberships.householdId,
    })
    .from(householdMemberships)
    .where(
      and(
        inArray(householdMemberships.memberId, personIds),
        isNull(householdMemberships.endedOn),
      ),
    );

  const houseOf = new Map(memberships.map((m) => [m.memberId, m.householdId]));
  const houses = [...new Set(memberships.map((m) => m.householdId))];

  const rows = await db
    .select({
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      region: addresses.region,
      postalCode: addresses.postalCode,
      memberId: addresses.memberId,
      householdId: addresses.householdId,
    })
    .from(addresses)
    .where(
      houses.length > 0
        ? or(
            inArray(addresses.memberId, personIds),
            inArray(addresses.householdId, houses),
          )
        : inArray(addresses.memberId, personIds),
    );

  for (const id of personIds) {
    const mine = rows.find((r) => r.memberId === id);
    const theirs = mine ?? rows.find((r) => r.householdId && r.householdId === houseOf.get(id));
    const line = theirs ? oneLine(theirs) : "";
    if (line) out.set(id, line);
  }

  return out;
}

/**
 * R1.7. People a church could give an account to.
 *
 * Only those holding an email address, because an invitation is sent to one,
 * and only those without an account or a pending invitation already, because
 * offering a name that is already on the team is offering a mistake. This is
 * what turns a volunteer in the directory into somebody a follow-up can land
 * on.
 */
export async function peopleToInvite(
  db: Tx,
  search = "",
  limit = 20,
): Promise<{ id: string; name: string; email: string }[]> {
  const needle = search.trim().toLowerCase();

  const rows = await db.execute<Record<string, unknown>>(sql`
    select p.id,
           coalesce(p.preferred_name, p.first_name) || ' ' || p.last_name as name,
           lower(c.value) as email
      from members p
      join lateral (
        select value
          from contact_methods
         where member_id = p.id and kind = 'email' and is_valid
         order by is_primary desc
         limit 1
      ) c on true
     where p.archived_at is null
       and not exists (
         select 1 from tenant_members m
           join app_users u on u.id = m.user_id
          where m.tenant_id = app_tenant_id() and lower(u.email) = lower(c.value)
       )
       and not exists (
         select 1 from invitations i
          where i.tenant_id = app_tenant_id()
            and lower(i.email) = lower(c.value)
            and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
       )
       ${needle
         ? sql`and lower(coalesce(p.preferred_name, p.first_name) || ' ' || p.last_name) like ${`%${needle}%`}`
         : sql``}
     order by p.last_name, p.first_name
     limit ${limit}
  `);

  return (rows as unknown as Record<string, string>[]).map((row) => ({
    id: String(row["id"]),
    name: String(row["name"]),
    email: String(row["email"]),
  }));
}

/**
 * R17.1. Somebody changing their own details.
 *
 * Deliberately not updatePerson with the role check skipped. This takes a user
 * id rather than a person id, looks up the record that belongs to that account,
 * and writes only the fields a person owns about themselves. A member who may
 * not edit anybody is still allowed to correct their own phone number, and they
 * cannot reach a second record by changing a number in a URL, because no id
 * crosses the boundary.
 *
 * Status, membership date and medical notes are the church's to set, so they
 * are not here, and neither is the email address: that is what they sign in
 * with, and it changes under Security.
 */
export async function updateOwnProfile(
  db: Tx,
  actor: { tenantId: string; userId: string; email: string },
  input: {
    firstName: string;
    lastName: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    /** R2.4. Where they live, in the parts a letter needs. */
    address?: string | AddressInput | null;
    campusId?: string | null;
    maritalStatus?: string | null;
    schoolLevel?: string | null;
    /** R2.11. The wedding date, which is held as a marriage milestone. */
    anniversary?: string | null;
  },
): Promise<string | null> {
  const [mine] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.appUserId, actor.userId), isNull(members.archivedAt)))
    .limit(1);
  if (!mine) return null;

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new InvalidInputError("profile.error.name");

  await db
    .update(members)
    .set({
      firstName,
      lastName,
      dateOfBirth: trimmed(input.dateOfBirth),
      campusId: trimmed(input.campusId),
      maritalStatus: trimmed(input.maritalStatus),
      schoolLevel: trimmed(input.schoolLevel),
      updatedAt: new Date(),
    })
    .where(eq(members.id, mine.id));

  const who = { tenantId: actor.tenantId, role: "owner" as const, userId: actor.userId };
  // R1.8. The address on the record is the address they sign in with. Changing
  // it is an authentication change, asked for under Security and confirmed by
  // email, so it is not something this form can quietly disagree with.
  await setContact(db, who, mine.id, "email", actor.email);
  await setContact(db, who, mine.id, "phone", input.phone);
  await setAddress(db, who, mine.id, input.address);
  await setAnniversary(db, who, mine.id, trimmed(input.anniversary));

  return mine.id;
}

/**
 * R2.11. The wedding date on a person.
 *
 * Held as a marriage milestone rather than a column, because that is what the
 * anniversary list already reads and two places holding the same date is two
 * places to disagree. One milestone a person: setting it again moves the one
 * that is there.
 */
export async function setAnniversary(
  db: Tx,
  actor: WriteActor,
  memberId: string,
  on: string | null,
): Promise<void> {
  await db
    .delete(milestones)
    .where(and(eq(milestones.memberId, memberId), eq(milestones.kind, "marriage")));

  if (!on) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) throw new InvalidInputError("milestone.error.date");

  await db.insert(milestones).values({
    tenantId: actor.tenantId,
    memberId,
    kind: "marriage",
    occurredOn: on,
  });
}

/** R2.11. The wedding date a person already has, or null. */
export async function anniversaryOf(db: Tx, memberId: string): Promise<string | null> {
  const [row] = await db
    .select({ on: sql<string>`${milestones.occurredOn}::text` })
    .from(milestones)
    .where(and(eq(milestones.memberId, memberId), eq(milestones.kind, "marriage")))
    .orderBy(desc(milestones.occurredOn))
    .limit(1);
  return row?.on ?? null;
}

/**
 * R17.1. Your own photograph.
 *
 * Takes a user id for the same reason updateOwnProfile does: the record is the
 * one the account owns, so nobody sets a face on somebody else's card. Returns
 * the key it replaced, which the caller takes out of the bucket.
 */
export async function setOwnPhoto(
  db: Tx,
  actor: { userId: string },
  key: string | null,
): Promise<{ removed: string | null }> {
  const [mine] = await db
    .select({ id: members.id, photoKey: members.photoKey })
    .from(members)
    .where(and(eq(members.appUserId, actor.userId), isNull(members.archivedAt)))
    .limit(1);
  if (!mine) throw new InvalidInputError("settings.profile.noRecord");

  await db
    .update(members)
    .set({ photoKey: key, updatedAt: new Date() })
    .where(eq(members.id, mine.id));

  const old = mine.photoKey;
  return { removed: old && old !== key ? old : null };
}
