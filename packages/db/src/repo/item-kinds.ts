import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { planItemKinds } from "../schema/plans";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageServices } from "./services";
import type { WriteActor } from "./members";

/**
 * R11.2. The kinds of item a church puts on a plan.
 *
 * These were eight words in code, which is our vocabulary rather than the
 * church's: a congregation that runs a testimony every week, or calls the
 * offering "tithes and offerings", had to file both under Other. So the list is
 * a record the church keeps, seeded with ours so nothing has to be set up
 * before the first plan is written.
 *
 * A plan item stores the slug, so renaming a kind leaves every plan alone.
 */

/** R11.2. The eight every church starts with. */
export const BUILT_IN_KINDS = [
  "song", "scripture", "sermon", "prayer", "offering",
  "announcement", "media", "custom",
] as const;

export interface ItemKindRow {
  id: string;
  /** What a plan item stores. Stable across every rename. */
  slug: string;
  /** The church's own word, or null while ours still stands. */
  name: string | null;
  archived: boolean;
}

const NAME_LIMIT = 40;

function checkName(name: string | undefined | null): string {
  const trimmed = name?.trim();
  if (!trimmed) throw new InvalidInputError("itemKind.error.name");
  return trimmed.slice(0, NAME_LIMIT);
}

/**
 * A slug from the church's own word, which is what the plans will hold.
 *
 * Anything that is not a letter or a digit becomes a dash, so "Tithes &
 * offerings" files as `tithes-offerings` and stays readable in an export.
 */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "item";
}

/** R11.2. Writes ours in for a church that has never had the list. */
async function seed(db: Tx, tenantId: string): Promise<void> {
  await db
    .insert(planItemKinds)
    .values(
      BUILT_IN_KINDS.map((slug, at) => ({ tenantId, slug, name: null, position: at })),
    )
    .onConflictDoNothing();
}

/** R11.2. What this church puts on a plan, in the order it reads them. */
export async function listItemKinds(
  db: Tx,
  tenantId: string,
  options: { includeArchived?: boolean } = {},
): Promise<ItemKindRow[]> {
  const read = () =>
    db
      .select({
        id: planItemKinds.id,
        slug: planItemKinds.slug,
        name: planItemKinds.name,
        archivedAt: planItemKinds.archivedAt,
      })
      .from(planItemKinds)
      .where(options.includeArchived ? undefined : isNull(planItemKinds.archivedAt))
      .orderBy(asc(planItemKinds.position), asc(planItemKinds.createdAt));

  let rows = await read();
  if (rows.length === 0) {
    await seed(db, tenantId);
    rows = await read();
  }

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    archived: row.archivedAt !== null,
  }));
}

/** R11.2. Whether a slug is one this church still puts on a plan. */
export async function kindIsLive(db: Tx, slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: planItemKinds.id })
    .from(planItemKinds)
    .where(and(eq(planItemKinds.slug, slug), isNull(planItemKinds.archivedAt)))
    .limit(1);
  return row !== undefined;
}

/** R11.2. A kind this church runs that the product had no word for. */
export async function addItemKind(
  db: Tx,
  actor: WriteActor,
  name: string,
): Promise<{ id: string }> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");
  const clean = checkName(name);
  await listItemKinds(db, actor.tenantId);

  const [clash] = await db
    .select({ id: planItemKinds.id })
    .from(planItemKinds)
    .where(eq(planItemKinds.name, clean))
    .limit(1);
  if (clash) throw new InvalidInputError("itemKind.error.taken");

  // The slug a plan item will hold. A second "Communion" lands on
  // communion-2 rather than colliding with the first.
  const base = slugify(clean);
  let slug = base;
  for (let n = 2; n < 50; n += 1) {
    const [taken] = await db
      .select({ id: planItemKinds.id })
      .from(planItemKinds)
      .where(eq(planItemKinds.slug, slug))
      .limit(1);
    if (!taken) break;
    slug = `${base}-${n}`;
  }

  const [last] = await db
    .select({ at: sql<number>`coalesce(max(${planItemKinds.position}), -1)::int` })
    .from(planItemKinds);

  const [row] = await db
    .insert(planItemKinds)
    .values({ tenantId: actor.tenantId, slug, name: clean, position: (last?.at ?? -1) + 1 })
    .returning({ id: planItemKinds.id });

  return { id: row!.id };
}

/** R11.2. The church's own word over one of ours, or over its own. */
export async function renameItemKind(
  db: Tx,
  actor: WriteActor,
  id: string,
  name: string,
): Promise<void> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");
  const clean = checkName(name);

  const [clash] = await db
    .select({ id: planItemKinds.id })
    .from(planItemKinds)
    .where(and(eq(planItemKinds.name, clean), ne(planItemKinds.id, id)))
    .limit(1);
  if (clash) throw new InvalidInputError("itemKind.error.taken");

  const changed = await db
    .update(planItemKinds)
    .set({ name: clean, updatedAt: new Date() })
    .where(eq(planItemKinds.id, id))
    .returning({ id: planItemKinds.id });
  if (changed.length === 0) throw new InvalidInputError("itemKind.error.missing");
}

/**
 * R11.2. Takes a kind off the list, or puts it back.
 *
 * The items already filed under it keep it, so a plan from last year still
 * reads the way it ran.
 */
export async function setItemKindArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");

  if (archived) {
    const [live] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(planItemKinds)
      .where(isNull(planItemKinds.archivedAt));
    if ((live?.count ?? 0) <= 1) throw new InvalidInputError("itemKind.error.last");
  }

  const changed = await db
    .update(planItemKinds)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(planItemKinds.id, id))
    .returning({ id: planItemKinds.id });
  if (changed.length === 0) throw new InvalidInputError("itemKind.error.missing");
}
