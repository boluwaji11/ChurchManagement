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
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { savedLists, savedListMembers } from "../schema/lists";
import { people } from "../schema/people";
import { InvalidInputError, NameTakenError } from "../errors";
import { PermissionError, canEditPeople, type TenantRole } from "../roles";

export interface WriteActor {
  tenantId: string;
  role: TenantRole;
  userId?: string;
}

/** The filters a rule list may hold. Anything else is dropped on the way in. */
export const RULE_KEYS = ["q", "status", "tag", "ability", "has", "show"] as const;
export type RuleKey = (typeof RULE_KEYS)[number];
export type ListRule = Partial<Record<RuleKey, string>>;

export interface SavedList {
  id: string;
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

export async function listSavedLists(
  db: Tx,
  opts: { includeArchived?: boolean } = {},
): Promise<SavedList[]> {
  const rows = await db
    .select({
      id: savedLists.id,
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
    .where(opts.includeArchived ? undefined : isNull(savedLists.archivedAt))
    .orderBy(asc(savedLists.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind === "rule" ? "rule" : "static",
    rule: (row.rule as ListRule | null) ?? null,
    count: row.kind === "rule" ? null : row.count,
    archivedAt: row.archivedAt,
    updatedAt: row.updatedAt,
  }));
}

export async function getSavedList(db: Tx, id: string): Promise<SavedList | null> {
  const all = await listSavedLists(db, { includeArchived: true });
  return all.find((list) => list.id === id) ?? null;
}

async function insert(
  db: Tx,
  actor: WriteActor,
  input: { name: string; kind: "static" | "rule"; rule?: ListRule | null },
): Promise<{ id: string }> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");

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
      kind: input.kind,
      rule: input.kind === "rule" ? (input.rule ?? {}) : null,
      createdByUserId: actor.userId ?? null,
    })
    .returning({ id: savedLists.id });
  return row!;
}

/** R1.14. A set somebody picked. */
export async function createStaticList(
  db: Tx,
  actor: WriteActor,
  input: { name: string; personIds: string[] },
): Promise<{ id: string; added: number }> {
  const list = await insert(db, actor, { name: input.name, kind: "static" });
  const added = await addToList(db, actor, { listId: list.id, personIds: input.personIds });
  return { id: list.id, added };
}

/** R1.14. A question the church wants answered again. */
export async function createRuleList(
  db: Tx,
  actor: WriteActor,
  input: { name: string; rule: ListRule },
): Promise<{ id: string }> {
  if (Object.keys(input.rule).length === 0) throw new InvalidInputError("lists.error.noRule");
  return insert(db, actor, { name: input.name, kind: "rule", rule: input.rule });
}

export async function renameList(
  db: Tx,
  actor: WriteActor,
  input: { id: string; name: string },
): Promise<void> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");

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
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");
  await db
    .update(savedLists)
    .set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(savedLists.id, input.id));
}

/** Adds people to a static list. Somebody already on it is left where they are. */
export async function addToList(
  db: Tx,
  actor: WriteActor,
  input: { listId: string; personIds: string[] },
): Promise<number> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");

  const [list] = await db
    .select({ id: savedLists.id, kind: savedLists.kind })
    .from(savedLists)
    .where(eq(savedLists.id, input.listId))
    .limit(1);
  if (!list) throw new InvalidInputError("lists.error.missing");
  if (list.kind === "rule") throw new InvalidInputError("lists.error.ruleList");

  const ids = [...new Set(input.personIds)].filter(Boolean);
  if (ids.length === 0) return 0;

  // Only people this church actually holds, because the ids arrive from a form.
  const real = await db
    .select({ id: people.id })
    .from(people)
    .where(and(inArray(people.id, ids), isNull(people.archivedAt)));
  if (real.length === 0) return 0;

  const written = await db
    .insert(savedListMembers)
    .values(real.map((row) => ({ tenantId: actor.tenantId, listId: input.listId, personId: row.id })))
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
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "editPerson");

  const ids = [...new Set(input.personIds)].filter(Boolean);
  if (ids.length === 0) return 0;

  const gone = await db
    .delete(savedListMembers)
    .where(
      and(eq(savedListMembers.listId, input.listId), inArray(savedListMembers.personId, ids)),
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
  id: string,
): Promise<{ name: string; kind: "static" | "rule"; ids?: string[]; rule?: ListRule } | null> {
  const list = await getSavedList(db, id);
  if (!list) return null;

  if (list.kind === "rule") {
    return { name: list.name, kind: "rule", rule: list.rule ?? {} };
  }

  const rows = await db
    .select({ personId: savedListMembers.personId })
    .from(savedListMembers)
    .where(eq(savedListMembers.listId, id))
    .orderBy(desc(savedListMembers.addedAt));

  return { name: list.name, kind: "static", ids: rows.map((row) => row.personId) };
}

/** Which lists this person is on, for their record. */
export async function listsForPerson(
  db: Tx,
  personId: string,
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: savedLists.id, name: savedLists.name })
    .from(savedListMembers)
    .innerJoin(savedLists, eq(savedLists.id, savedListMembers.listId))
    .where(and(eq(savedListMembers.personId, personId), isNull(savedLists.archivedAt)))
    .orderBy(asc(savedLists.name));
}
