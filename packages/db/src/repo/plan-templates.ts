import { and, asc, desc, eq, isNull, lt, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import {
  servicePlans, planItems, planTemplates, planTemplateItems,
} from "../schema/plans";
import { serviceOccurrences } from "../schema/gatherings";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageServices } from "./services";
import type { ItemKind } from "./plans";
import { listItemKinds, kindIsLive } from "./item-kinds";
import type { WriteActor } from "./members";

/**
 * R11.8. Templates, and starting from a plan the church has already run.
 *
 * Most weeks are the same shape and different content. So what is carried over
 * is the shape: the kinds, the titles and the lengths, in order. The notes were
 * written to last week's team, the files were last week's charts and the theme
 * was last week's idea, so they are left where they were.
 */

export interface PlanTemplate {
  id: string;
  name: string;
  items: number;
  minutes: number;
}

/** A plan already run, offered as a starting point. */
export interface PlanSource {
  occurrenceId: string;
  name: string;
  occursOn: string;
  items: number;
  minutes: number;
}

const NAME_LIMIT = 80;

function checkName(name: string | undefined | null): string {
  const trimmed = name?.trim();
  if (!trimmed) throw new InvalidInputError("order.error.templateName");
  return trimmed.slice(0, NAME_LIMIT);
}

/** R11.8. The shapes this church has saved, the live ones. */
export async function listTemplates(db: Tx): Promise<PlanTemplate[]> {
  return db
    .select({
      id: planTemplates.id,
      name: planTemplates.name,
      items: sql<number>`count(${planTemplateItems.id})::int`,
      minutes: sql<number>`coalesce(sum(${planTemplateItems.minutes}), 0)::int`,
    })
    .from(planTemplates)
    .leftJoin(planTemplateItems, eq(planTemplateItems.templateId, planTemplates.id))
    .where(isNull(planTemplates.archivedAt))
    .groupBy(planTemplates.id, planTemplates.name)
    .orderBy(asc(planTemplates.name));
}

/**
 * R11.8. Saves this plan's shape under a name.
 *
 * Saving again under a name already used replaces that template, because the
 * church is correcting the shape rather than collecting versions of it.
 */
export async function saveAsTemplate(
  db: Tx,
  actor: WriteActor,
  input: { planId: string; name: string },
): Promise<{ id: string }> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");
  const name = checkName(input.name);

  const rows = await db
    .select({
      kind: planItems.kind,
      title: planItems.title,
      minutes: planItems.minutes,
      position: planItems.position,
    })
    .from(planItems)
    .where(eq(planItems.planId, input.planId))
    .orderBy(asc(planItems.position), asc(planItems.createdAt));
  if (rows.length === 0) throw new InvalidInputError("order.error.templateEmpty");

  const [existing] = await db
    .select({ id: planTemplates.id })
    .from(planTemplates)
    .where(eq(planTemplates.name, name))
    .limit(1);

  let id = existing?.id;
  if (id) {
    await db.delete(planTemplateItems).where(eq(planTemplateItems.templateId, id));
    await db
      .update(planTemplates)
      .set({ updatedAt: new Date() })
      .where(eq(planTemplates.id, id));
  } else {
    const [created] = await db
      .insert(planTemplates)
      .values({ tenantId: actor.tenantId, name })
      .returning({ id: planTemplates.id });
    id = created!.id;
  }

  await db.insert(planTemplateItems).values(
    rows.map((row, at) => ({
      tenantId: actor.tenantId,
      templateId: id!,
      kind: row.kind,
      title: row.title,
      minutes: row.minutes,
      position: at,
    })),
  );

  return { id };
}

/** One line of a shape as it is written down. */
export interface ShapeInput {
  kind: string;
  title: string;
  minutes: number;
}

/** A shape and everything on it, for a screen that edits the shape itself. */
export interface TemplateShape extends PlanTemplate {
  lines: ShapeItem[];
  archived: boolean;
}

async function checkLines(
  db: Tx,
  tenantId: string,
  items: ShapeInput[],
): Promise<{ kind: ItemKind; title: string; minutes: number }[]> {
  if (items.length === 0) throw new InvalidInputError("order.error.templateEmpty");

  // R11.2. Filed under the kinds this church runs, read from its own list.
  await listItemKinds(db, tenantId);

  const lines = [];
  for (const item of items) {
    const title = item.title?.trim();
    if (!title) throw new InvalidInputError("order.error.title");
    if (!Number.isInteger(item.minutes) || item.minutes < 0 || item.minutes > 600) {
      throw new InvalidInputError("order.error.minutes");
    }
    if (!(await kindIsLive(db, item.kind))) throw new InvalidInputError("order.error.kind");
    lines.push({ kind: item.kind, title: title.slice(0, 200), minutes: item.minutes });
  }
  return lines;
}

/**
 * R11.8. A shape written down on its own, with no plan behind it.
 *
 * A church setting up has an order of service in its head before it has a
 * service in the calendar, so the shape is a record it can write once and reach
 * from settings, rather than something that only exists as a copy of a week
 * that already happened.
 */
export async function writeTemplate(
  db: Tx,
  actor: WriteActor,
  input: { id?: string; name: string; items: ShapeInput[] },
): Promise<{ id: string }> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");
  const name = checkName(input.name);
  const lines = await checkLines(db, actor.tenantId, input.items);

  const [clash] = await db
    .select({ id: planTemplates.id })
    .from(planTemplates)
    .where(
      input.id
        ? and(eq(planTemplates.name, name), ne(planTemplates.id, input.id))
        : eq(planTemplates.name, name),
    )
    .limit(1);
  if (clash) throw new InvalidInputError("order.error.templateTaken");

  let id = input.id;
  if (id) {
    const changed = await db
      .update(planTemplates)
      .set({ name, updatedAt: new Date() })
      .where(eq(planTemplates.id, id))
      .returning({ id: planTemplates.id });
    if (changed.length === 0) throw new InvalidInputError("order.error.template");
    await db.delete(planTemplateItems).where(eq(planTemplateItems.templateId, id));
  } else {
    const [created] = await db
      .insert(planTemplates)
      .values({ tenantId: actor.tenantId, name })
      .returning({ id: planTemplates.id });
    id = created!.id;
  }

  await db.insert(planTemplateItems).values(
    lines.map((line, at) => ({
      tenantId: actor.tenantId,
      templateId: id!,
      kind: line.kind,
      title: line.title,
      minutes: line.minutes,
      position: at,
    })),
  );

  return { id };
}

/** R11.8. Every shape this church keeps, with what is on each one. */
export async function listTemplateShapes(db: Tx): Promise<TemplateShape[]> {
  const rows = await db
    .select({
      id: planTemplates.id,
      name: planTemplates.name,
      archivedAt: planTemplates.archivedAt,
      kind: planTemplateItems.kind,
      title: planTemplateItems.title,
      minutes: planTemplateItems.minutes,
    })
    .from(planTemplates)
    .leftJoin(planTemplateItems, eq(planTemplateItems.templateId, planTemplates.id))
    .orderBy(asc(planTemplates.name), asc(planTemplateItems.position), asc(planTemplateItems.createdAt));

  const held = new Map<string, TemplateShape>();
  for (const row of rows) {
    let shape = held.get(row.id);
    if (!shape) {
      shape = {
        id: row.id,
        name: row.name,
        items: 0,
        minutes: 0,
        lines: [],
        archived: row.archivedAt !== null,
      };
      held.set(row.id, shape);
    }
    if (row.title === null) continue;
    shape.lines.push({ kind: row.kind!, title: row.title, minutes: row.minutes ?? 0 });
    shape.items += 1;
    shape.minutes += row.minutes ?? 0;
  }

  return [...held.values()];
}

export async function renameTemplate(
  db: Tx,
  actor: WriteActor,
  id: string,
  name: string,
): Promise<void> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");
  const clean = checkName(name);

  const [clash] = await db
    .select({ id: planTemplates.id })
    .from(planTemplates)
    .where(and(eq(planTemplates.name, clean), ne(planTemplates.id, id)))
    .limit(1);
  if (clash) throw new InvalidInputError("order.error.templateTaken");

  const changed = await db
    .update(planTemplates)
    .set({ name: clean, updatedAt: new Date() })
    .where(eq(planTemplates.id, id))
    .returning({ id: planTemplates.id });
  if (changed.length === 0) throw new InvalidInputError("order.error.template");
}

/**
 * R11.8. Takes a shape off the list a plan starts from, or puts it back.
 *
 * The plans built from it keep their items either way: a plan is a record of a
 * service, and it stopped being a copy of this shape the moment it was laid
 * down.
 */
export async function setTemplateArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");
  const changed = await db
    .update(planTemplates)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(planTemplates.id, id))
    .returning({ id: planTemplates.id });
  if (changed.length === 0) throw new InvalidInputError("order.error.template");
}

/**
 * R11.8. Deletes a template outright.
 *
 * A template describes nothing that happened, so there is no record to keep.
 * The plans built from it are untouched.
 */
export async function removeTemplate(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");
  const removed = await db
    .delete(planTemplates)
    .where(eq(planTemplates.id, id))
    .returning({ id: planTemplates.id });
  if (removed.length === 0) throw new InvalidInputError("order.error.template");
}

/** Where the next item goes, given what is on the plan already. */
async function endOf(db: Tx, planId: string): Promise<number> {
  const [last] = await db
    .select({ at: sql<number>`coalesce(max(${planItems.position}), -1)::int` })
    .from(planItems)
    .where(eq(planItems.planId, planId));
  return (last?.at ?? -1) + 1;
}

/** R11.8. Lays a saved shape onto a plan, after whatever is already there. */
export async function applyTemplate(
  db: Tx,
  actor: WriteActor,
  input: { planId: string; templateId: string },
): Promise<{ added: number }> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");

  const rows = await db
    .select({
      kind: planTemplateItems.kind,
      title: planTemplateItems.title,
      minutes: planTemplateItems.minutes,
    })
    .from(planTemplateItems)
    .where(eq(planTemplateItems.templateId, input.templateId))
    .orderBy(asc(planTemplateItems.position), asc(planTemplateItems.createdAt));
  if (rows.length === 0) throw new InvalidInputError("order.error.template");

  const from = await endOf(db, input.planId);
  await db.insert(planItems).values(
    rows.map((row, at) => ({
      tenantId: actor.tenantId,
      planId: input.planId,
      kind: row.kind,
      title: row.title,
      minutes: row.minutes,
      position: from + at,
    })),
  );

  return { added: rows.length };
}

/**
 * R11.8. Plans already run, newest first, as starting points for this one.
 *
 * Only services before this one, and only ones with something on the plan, so
 * the list offers nothing that would copy across as nothing.
 */
export async function recentPlans(
  db: Tx,
  occurrenceId: string,
  limit = 6,
): Promise<PlanSource[]> {
  const [here] = await db
    .select({ occursOn: sql<string>`${serviceOccurrences.occursOn}::text` })
    .from(serviceOccurrences)
    .where(eq(serviceOccurrences.id, occurrenceId))
    .limit(1);
  if (!here) return [];

  return db
    .select({
      occurrenceId: servicePlans.occurrenceId,
      name: serviceOccurrences.name,
      occursOn: sql<string>`${serviceOccurrences.occursOn}::text`,
      items: sql<number>`count(${planItems.id})::int`,
      minutes: sql<number>`coalesce(sum(${planItems.minutes}), 0)::int`,
    })
    .from(servicePlans)
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servicePlans.occurrenceId))
    .innerJoin(planItems, eq(planItems.planId, servicePlans.id))
    .where(
      and(
        lt(serviceOccurrences.occursOn, here.occursOn),
        ne(servicePlans.occurrenceId, occurrenceId),
      ),
    )
    .groupBy(servicePlans.occurrenceId, serviceOccurrences.name, serviceOccurrences.occursOn)
    .orderBy(desc(serviceOccurrences.occursOn))
    .limit(limit);
}

/**
 * R11.8. Copies the shape of a plan already run onto this one.
 *
 * The same rule as a template: kinds, titles and lengths come over. Notes,
 * files and the theme stay with the week they were written for.
 */
export async function copyPlan(
  db: Tx,
  actor: WriteActor,
  input: { planId: string; fromOccurrenceId: string },
): Promise<{ added: number }> {
  if (!canManageServices(actor)) throw new PermissionError(actor.role, "managePlans");

  const [source] = await db
    .select({ id: servicePlans.id })
    .from(servicePlans)
    .where(eq(servicePlans.occurrenceId, input.fromOccurrenceId))
    .limit(1);
  if (!source) throw new InvalidInputError("order.error.source");
  if (source.id === input.planId) throw new InvalidInputError("order.error.source");

  const rows = await db
    .select({
      kind: planItems.kind,
      title: planItems.title,
      minutes: planItems.minutes,
    })
    .from(planItems)
    .where(eq(planItems.planId, source.id))
    .orderBy(asc(planItems.position), asc(planItems.createdAt));
  if (rows.length === 0) throw new InvalidInputError("order.error.source");

  const from = await endOf(db, input.planId);
  await db.insert(planItems).values(
    rows.map((row, at) => ({
      tenantId: actor.tenantId,
      planId: input.planId,
      kind: row.kind,
      title: row.title,
      minutes: row.minutes,
      position: from + at,
    })),
  );

  return { added: rows.length };
}

export interface ShapeItem {
  kind: string;
  title: string;
  minutes: number;
}

/** R11.8. What a saved shape holds, for reading before it is used. */
export async function templateItems(db: Tx, templateId: string): Promise<ShapeItem[]> {
  return db
    .select({
      kind: planTemplateItems.kind,
      title: planTemplateItems.title,
      minutes: planTemplateItems.minutes,
    })
    .from(planTemplateItems)
    .where(eq(planTemplateItems.templateId, templateId))
    .orderBy(asc(planTemplateItems.position), asc(planTemplateItems.createdAt));
}

/** R11.8. What a plan already run holds, for the same reading. */
export async function planItemsFor(db: Tx, occurrenceId: string): Promise<ShapeItem[]> {
  return db
    .select({
      kind: planItems.kind,
      title: planItems.title,
      minutes: planItems.minutes,
    })
    .from(planItems)
    .innerJoin(servicePlans, eq(servicePlans.id, planItems.planId))
    .where(eq(servicePlans.occurrenceId, occurrenceId))
    .orderBy(asc(planItems.position), asc(planItems.createdAt));
}
