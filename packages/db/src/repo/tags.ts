import { and, asc, eq, sql, count, ne } from "drizzle-orm";
import type { Tx } from "../client";
import { tags, personTags } from "../schema/people";
import { canEditPeople, PermissionError, type TenantRole } from "../roles";
import { InvalidInputError, NameTakenError } from "../errors";
import type { WriteActor } from "./people";

/**
 * R1.13. Freeform tags, with management and merge.
 *
 * A tag is the escape hatch that stops a church asking for a column. "Choir",
 * "Needs a ride", "Came from the Easter service". The taxonomy belongs to the
 * church, so the only rules here are the ones that keep it usable: no
 * duplicates that differ by case, a hue on every tag, and a merge for when
 * somebody has typed "Greeter" and "Greeters".
 */

/** The eight hues the product assigns. Matches HUES in packages/ui. */
const PALETTE = [
  "rose", "amber", "citron", "fern", "teal", "sky", "indigo", "violet",
] as const;
export type TagHue = (typeof PALETTE)[number];
export const TAG_HUES = PALETTE;

export interface TagRow {
  id: string;
  name: string;
  hue: string;
  people: number;
}

/**
 * Renaming and deleting reshape the taxonomy for everyone, so they stay with
 * Owner and Admin. Creating and applying a tag is ordinary daily work, so anyone
 * who may edit a person may do it. A volunteer who cannot invent a tag mid-task
 * writes it in the notes field instead, which is worse.
 */
export const CAN_MANAGE_TAGS: readonly TenantRole[] = ["owner", "admin"];
export const canManageTags = (role: TenantRole): boolean => CAN_MANAGE_TAGS.includes(role);

/** Trimmed, internal whitespace collapsed. "  Youth   choir " becomes "Youth choir". */
export const normaliseTagName = (raw: string): string => raw.trim().replace(/\s+/g, " ");

export async function listTagsWithCounts(db: Tx): Promise<TagRow[]> {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      hue: tags.hue,
      people: sql<number>`(select count(*) from person_tags pt where pt.tag_id = ${tags.id})`,
    })
    .from(tags)
    .orderBy(asc(tags.name));

  return rows.map((r) => ({ ...r, people: Number(r.people) }));
}

/**
 * Finds a tag by name, ignoring case.
 *
 * The unique index is exact, so "Choir" and "choir" would both be accepted by
 * Postgres and would look like a bug to the person who created the second one.
 */
async function findByName(db: Tx, name: string): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(sql`lower(${tags.name}) = lower(${name})`)
    .limit(1);
  return row ?? null;
}

/**
 * Picks the least-used hue.
 *
 * Hues exist so a list of tags can be read at a glance. Assigning at random puts
 * three greens next to each other roughly one time in five, so this counts what
 * is already in use and takes the emptiest slot.
 */
async function nextHue(db: Tx): Promise<TagHue> {
  const used = await db.select({ hue: tags.hue, n: count() }).from(tags).groupBy(tags.hue);
  const tally = new Map<string, number>(used.map((r) => [r.hue, Number(r.n)]));
  let best: TagHue = PALETTE[0];
  for (const hue of PALETTE) {
    if ((tally.get(hue) ?? 0) < (tally.get(best) ?? 0)) best = hue;
  }
  return best;
}

export async function createTag(
  db: Tx,
  actor: WriteActor,
  input: { name: string; hue?: TagHue },
): Promise<{ id: string; name: string; hue: string }> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "createTag");

  const name = normaliseTagName(input.name);
  if (!name) throw new InvalidInputError("error.tagNameBlank");

  const existing = await findByName(db, name);
  if (existing) throw new NameTakenError("error.nameTaken.tag", name, existing.id);

  const hue = input.hue ?? (await nextHue(db));
  const [row] = await db
    .insert(tags)
    .values({ tenantId: actor.tenantId, name, hue })
    .returning({ id: tags.id, name: tags.name, hue: tags.hue });

  if (!row) throw new Error("Tag insert returned no row.");
  return row;
}

export async function renameTag(db: Tx, actor: WriteActor, id: string, rawName: string): Promise<void> {
  if (!canManageTags(actor.role)) throw new PermissionError(actor.role, "renameTag");

  const name = normaliseTagName(rawName);
  if (!name) throw new InvalidInputError("error.tagNameBlank");

  const clash = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(sql`lower(${tags.name}) = lower(${name})`, ne(tags.id, id)))
    .limit(1);
  if (clash[0]) throw new NameTakenError("error.nameTaken.tag", name, clash[0].id);

  const changed = await db.update(tags).set({ name }).where(eq(tags.id, id)).returning({ id: tags.id });
  if (changed.length === 0) throw new Error("No such tag.");
}

export async function setTagHue(db: Tx, actor: WriteActor, id: string, hue: TagHue): Promise<void> {
  if (!canManageTags(actor.role)) throw new PermissionError(actor.role, "recolourTag");

  const changed = await db.update(tags).set({ hue }).where(eq(tags.id, id)).returning({ id: tags.id });
  if (changed.length === 0) throw new Error("No such tag.");
}

/**
 * Deletes the tag and every assignment of it.
 *
 * This is the one place the archive-never-delete rule does not apply, and it is
 * worth being explicit about why. A tag is a label, not a record of anything that
 * happened. An archived tag would have to be hidden from every picker and still
 * shown on the people who carry it, which is a worse answer than removing a
 * label the church says it does not want. Nothing about a person is lost.
 */
export async function deleteTag(db: Tx, actor: WriteActor, id: string): Promise<{ removedFrom: number }> {
  if (!canManageTags(actor.role)) throw new PermissionError(actor.role, "deleteTag");

  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(personTags)
    .where(eq(personTags.tagId, id));

  const changed = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });
  if (changed.length === 0) throw new Error("No such tag.");

  return { removedFrom: Number(n) };
}

/**
 * Folds one tag into another. "Greeters" into "Greeter".
 *
 * Everyone who carried the old tag carries the target instead, and anyone who
 * already had both keeps one. The insert skips conflicts rather than failing,
 * because the overlap between two tags that mean the same thing is usually
 * large.
 */
export async function mergeTags(
  db: Tx,
  actor: WriteActor,
  input: { fromId: string; intoId: string },
): Promise<{ moved: number }> {
  if (!canManageTags(actor.role)) throw new PermissionError(actor.role, "mergeTags");
  if (input.fromId === input.intoId) throw new InvalidInputError("error.tagMergeSelf");

  const found = await db
    .select({ id: tags.id })
    .from(tags)
    .where(sql`${tags.id} in (${input.fromId}::uuid, ${input.intoId}::uuid)`);
  if (found.length !== 2) throw new Error("No such tag.");

  const moved = await db.execute(sql`
    insert into person_tags (tenant_id, person_id, tag_id)
    select tenant_id, person_id, ${input.intoId}::uuid from person_tags where tag_id = ${input.fromId}::uuid
    on conflict do nothing`);

  await db.delete(tags).where(eq(tags.id, input.fromId));

  return { moved: Number((moved as unknown as { count?: number }).count ?? 0) };
}

/** Applies or removes one tag on one person. Idempotent in both directions. */
export async function setPersonTag(
  db: Tx,
  actor: WriteActor,
  personId: string,
  tagId: string,
  on: boolean,
): Promise<void> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "tagPerson");

  if (!on) {
    await db
      .delete(personTags)
      .where(and(eq(personTags.personId, personId), eq(personTags.tagId, tagId)));
    return;
  }

  // Both ids are checked against the tenant-scoped tables first. Row-level
  // security would reject a foreign tag on insert, but the error it gives is a
  // constraint violation, and a person deserves a sentence they can act on.
  const [tag] = await db.select({ id: tags.id }).from(tags).where(eq(tags.id, tagId)).limit(1);
  if (!tag) throw new Error("No such tag.");

  await db.execute(sql`
    insert into person_tags (tenant_id, person_id, tag_id)
    values (${actor.tenantId}::uuid, ${personId}::uuid, ${tagId}::uuid)
    on conflict do nothing`);
}
