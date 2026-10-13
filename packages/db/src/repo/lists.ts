/**
 * R1.14. Saved lists.
 *
 * A static list is who somebody picked and stays that way. A rule list is the
 * directory's filters, stored, and answers itself every time it is opened.
 *
 * The rule is deliberately the same four filters the directory already has.
 * Anybody who can narrow the directory can build a list, and there is no second
 * thing to learn. A query builder is where free church software usually stops
 * being usable by the person who actually has to use it.
 */
import { and, asc, desc, eq, inArray, isNull, isNotNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { savedLists, savedListMembers } from "../schema/lists";
import { members } from "../schema/members";
import { InvalidInputError, NameTakenError } from "../errors";
import { PermissionError, canEditPeople, type TenantRole } from "../roles";

export interface WriteActor {
  tenantId: string;
  role: TenantRole;
  userId?: string;
}

/** The filters a rule list may hold. Anything else is dropped on the way in. */
export const RULE_KEYS = [
  "q", "status", "tag", "has", "show", "missing", "joined", "group", "serving", "seen",
] as const;
export type RuleKey = (typeof RULE_KEYS)[number];
export type ListRule = Partial<Record<RuleKey, string>>;

export interface SavedList {
  id: string;
  /** R1.14. The list's name in an address, so nobody copies a uuid. */
  slug: string | null;
  name: string;
  kind: "static" | "rule";
  rule: ListRule | null;
  /** Only on a static list. A rule list is counted when it is read. */
  count: number | null;
  archivedAt: Date | null;
  updatedAt: Date;
}

const clean = (name: string): string => name.trim().replace(/\s+/g, " ");

/** Keeps the filters we know about and throws the rest away. */
export function cleanRule(input: Record<string, string | undefined>): ListRule {
  const rule: ListRule = {};
  for (const key of RULE_KEYS) {
    const value = input[key]?.trim();
    if (value) rule[key] = value;
  }
  return rule;
}

/** R1.14. How many saved lists have been archived, for the link to them. */
export async function countArchivedSavedLists(db: Tx): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(savedLists)
    .where(isNotNull(savedLists.archivedAt));
  return row?.count ?? 0;
}

export async function listSavedLists(
  db: Tx,
  opts: { includeArchived?: boolean; archivedOnly?: boolean } = {},
): Promise<SavedList[]> {
  const rows = await db
    .select({
      id: savedLists.id,
      slug: savedLists.slug,
      name: savedLists.name,
      kind: savedLists.kind,
      rule: savedLists.rule,
      archivedAt: savedLists.archivedAt,
      updatedAt: savedLists.updatedAt,
      // Written out rather than interpolated: Drizzle renders a column
      // reference inside a sql template unqualified, so the correlation came
      // out as m.list_id = "id", which resolves to the subquery's own row and
      // counts nothing.
      count: sql<number>`(
        select count(*)::int from saved_list_members m
        where m.list_id = saved_lists.id
      )`,
    })
    .from(savedLists)
    .where(
      opts.archivedOnly
        ? isNotNull(savedLists.archivedAt)
        : opts.includeArchived
          ? undefined
          : isNull(savedLists.archivedAt),
    )
    .orderBy(asc(savedLists.name));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind === "rule" ? "rule" : "static",
    rule: (row.rule as ListRule | null) ?? null,
    count: row.kind === "rule" ? null : row.count,
    archivedAt: row.archivedAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * R1.14. One list, by its name in an address or by its id.
 *
 * Both, because an address somebody saved before lists had names in them is
 * still an address somebody saved.
 */
export async function getSavedList(db: Tx, key: string): Promise<SavedList | null> {
  const all = await listSavedLists(db, { includeArchived: true });
  return all.find((list) => list.slug === key) ?? all.find((list) => list.id === key) ?? null;
}

/** The slug a name reads as: lower case, words joined by a hyphen. */
function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    || "list";
}

/**
 * R1.14. The slug a new list gets.
 *
 * Two names can read the same once punctuation is dropped, so a second one
 * takes a number. It is set when the list is written and stays as it is
 * through a rename, so an address somebody saved goes on working.
 */
async function freeListSlug(db: Tx, name: string): Promise<string> {
  const base = slugOf(name.slice(0, 60));
  const taken = await db
    .select({ slug: savedLists.slug })
    .from(savedLists)
    .where(sql`${savedLists.slug} = ${base} or ${savedLists.slug} like ${`${base}-%`}`);
  const used = new Set(taken.map((one) => one.slug));
  let slug = base;
  for (let at = 2; used.has(slug); at += 1) slug = `${base}-${at}`;
  return slug;
}

async function insert(
  db: Tx,
  actor: WriteActor,
  input: { name: string; kind: "static" | "rule"; rule?: ListRule | null },
): Promise<{ id: string; slug: string }> {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "editPerson");

  const name = clean(input.name);
  if (!name) throw new InvalidInputError("lists.error.name");
  if (name.length > 80) throw new InvalidInputError("lists.error.nameLong");

  const [taken] = await db
    .select({ id: savedLists.id })
    .from(savedLists)
    .where(sql`lower(${savedLists.name}) = lower(${name})`)
    .limit(1);
  if (taken) throw new NameTakenError("lists.error.taken", name, taken.id);

  const [row] = await db
    .insert(savedLists)
    .values({
      tenantId: actor.tenantId,
      name,
      slug: await freeListSlug(db, name),
      kind: input.kind,
      rule: input.kind === "rule" ? (input.rule ?? {}) : null,
      createdByUserId: actor.userId ?? null,
    })
    .returning({ id: savedLists.id, slug: savedLists.slug });
  return { id: row!.id, slug: row!.slug ?? "" };
}

/** R1.14. A set somebody picked. */
export async function createStaticList(
  db: Tx,
  actor: WriteActor,
  input: { name: string; personIds: string[] },
): Promise<{ id: string; slug: string; added: number }> {
  const list = await insert(db, actor, { name: input.name, kind: "static" });
  const added = await addToList(db, actor, { listId: list.id, personIds: input.personIds });
  return { id: list.id, slug: list.slug, added };
}

/** R1.14. A question the church wants answered again. */
export async function createRuleList(
  db: Tx,
  actor: WriteActor,
  input: { name: string; rule: ListRule },
): Promise<{ id: string; slug: string }> {
  if (Object.keys(input.rule).length === 0) throw new InvalidInputError("lists.error.noRule");
  return insert(db, actor, { name: input.name, kind: "rule", rule: input.rule });
}

export async function renameList(
  db: Tx,
  actor: WriteActor,
  input: { id: string; name: string },
): Promise<void> {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "editPerson");

  const name = clean(input.name);
  if (!name) throw new InvalidInputError("lists.error.name");

  const [taken] = await db
    .select({ id: savedLists.id })
    .from(savedLists)
    .where(and(sql`lower(${savedLists.name}) = lower(${name})`, sql`${savedLists.id} <> ${input.id}`))
    .limit(1);
  if (taken) throw new NameTakenError("lists.error.taken", name, taken.id);

  await db
    .update(savedLists)
    .set({ name, updatedAt: new Date() })
    .where(eq(savedLists.id, input.id));
}

/** R1.14. Putting a list away. Nobody on it is touched. */
export async function setListArchived(
  db: Tx,
  actor: WriteActor,
  input: { id: string; archived: boolean },
): Promise<void> {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "editPerson");
  await db
    .update(savedLists)
    .set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(savedLists.id, input.id));
}

/** Adds members to a static list. Somebody already on it is left where they are. */
export async function addToList(
  db: Tx,
  actor: WriteActor,
  input: { listId: string; personIds: string[] },
): Promise<number> {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "editPerson");

  const [list] = await db
    .select({ id: savedLists.id, kind: savedLists.kind })
    .from(savedLists)
    .where(eq(savedLists.id, input.listId))
    .limit(1);
  if (!list) throw new InvalidInputError("lists.error.missing");
  if (list.kind === "rule") throw new InvalidInputError("lists.error.ruleList");

  const ids = [...new Set(input.personIds)].filter(Boolean);
  if (ids.length === 0) return 0;

  // Only members this church actually holds, because the ids arrive from a form.
  const real = await db
    .select({ id: members.id })
    .from(members)
    .where(and(inArray(members.id, ids), isNull(members.archivedAt)));
  if (real.length === 0) return 0;

  const written = await db
    .insert(savedListMembers)
    .values(real.map((row) => ({ tenantId: actor.tenantId, listId: input.listId, memberId: row.id })))
    .onConflictDoNothing()
    .returning({ id: savedListMembers.id });

  await db.update(savedLists).set({ updatedAt: new Date() }).where(eq(savedLists.id, input.listId));
  return written.length;
}

/** R1.14. Taking somebody off a list. Their record is untouched. */
export async function removeFromList(
  db: Tx,
  actor: WriteActor,
  input: { listId: string; personIds: string[] },
): Promise<number> {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "editPerson");

  const ids = [...new Set(input.personIds)].filter(Boolean);
  if (ids.length === 0) return 0;

  const gone = await db
    .delete(savedListMembers)
    .where(
      and(eq(savedListMembers.listId, input.listId), inArray(savedListMembers.memberId, ids)),
    )
    .returning({ id: savedListMembers.id });

  await db.update(savedLists).set({ updatedAt: new Date() }).where(eq(savedLists.id, input.listId));
  return gone.length;
}

/**
 * What a list means as a directory query.
 *
 * A static list is a set of ids. A rule list is the filters it was saved with,
 * which the directory applies exactly as if somebody had typed them in.
 */
export async function resolveList(
  db: Tx,
  key: string,
): Promise<
  { id: string; name: string; kind: "static" | "rule"; ids?: string[]; rule?: ListRule } | null
> {
  const list = await getSavedList(db, key);
  if (!list) return null;

  if (list.kind === "rule") {
    return { id: list.id, name: list.name, kind: "rule", rule: list.rule ?? {} };
  }

  /* The list's own id, because `key` can be the name in the address and the
     rows are held against the id. */
  const rows = await db
    .select({ memberId: savedListMembers.memberId })
    .from(savedListMembers)
    .where(eq(savedListMembers.listId, list.id))
    .orderBy(desc(savedListMembers.addedAt));

  return { id: list.id, name: list.name, kind: "static", ids: rows.map((row) => row.memberId) };
}

/** Which lists this person is on, for their record. */
export async function listsForPerson(
  db: Tx,
  memberId: string,
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: savedLists.id, name: savedLists.name })
    .from(savedListMembers)
    .innerJoin(savedLists, eq(savedLists.id, savedListMembers.listId))
    .where(and(eq(savedListMembers.memberId, memberId), isNull(savedLists.archivedAt)))
    .orderBy(asc(savedLists.name));
}
