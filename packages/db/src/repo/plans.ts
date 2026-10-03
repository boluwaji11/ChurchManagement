import { and, asc, eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { servicePlans, planItems } from "../schema/plans";
import { serviceOccurrences } from "../schema/gatherings";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageServices } from "./services";
import type { WriteActor } from "./people";

/**
 * R11.1 to R11.3. The order of service.
 *
 * This is the document a church runs a gathering from, and the thing it is
 * asked of most often is "are we going to overrun". So the durations are
 * required and the running total is the point of the screen: every item carries
 * the clock time it starts at, and the plan carries the time it ends.
 */

/** R11.2. The kinds a church already has words for, plus one for everything else. */
export const ITEM_KINDS = [
  "song", "scripture", "sermon", "prayer", "offering",
  "announcement", "media", "custom",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export interface PlanItem {
  id: string;
  kind: ItemKind;
  title: string;
  description: string | null;
  minutes: number;
  position: number;
  /** R11.3. The clock time this item starts at, from the service start. */
  startsAt: string;
}

export interface ServicePlan {
  id: string;
  occurrenceId: string;
  serviceName: string;
  occursOn: string;
  /** The gathering's own start, which the running total counts from. */
  serviceStartsAt: string;
  title: string | null;
  series: string | null;
  theme: string | null;
  items: PlanItem[];
  /** R11.3. Minutes planned, and the clock time the plan runs to. */
  minutes: number;
  endsAt: string;
}

export interface PlanInput {
  title?: string | null;
  series?: string | null;
  theme?: string | null;
}

export interface ItemInput {
  kind: ItemKind;
  title: string;
  description?: string | null;
  minutes: number;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes past midnight, from HH:MM. */
const toMinutes = (time: string): number => {
  const parts = HHMM.exec(time);
  if (!parts) return 0;
  return Number(parts[1]) * 60 + Number(parts[2]);
};

/** HH:MM, from minutes past midnight. Wraps, so a plan running past midnight reads. */
const toTime = (minutes: number): string => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
};

/**
 * R11.3. What time each item starts and what time the plan runs to.
 *
 * Pure, and exported, because the editor recalculates it on every keystroke and
 * a round trip to say "that is now 11:04" is a round trip too many.
 */
export function runningTimes<T extends { minutes: number }>(
  startsAt: string,
  items: T[],
): { items: (T & { startsAt: string })[]; minutes: number; endsAt: string } {
  let at = toMinutes(startsAt);
  const out = items.map((item) => {
    const row = { ...item, startsAt: toTime(at) };
    at += item.minutes;
    return row;
  });
  return { items: out, minutes: at - toMinutes(startsAt), endsAt: toTime(at) };
}

const COLUMNS = {
  id: planItems.id,
  kind: planItems.kind,
  title: planItems.title,
  description: planItems.description,
  minutes: planItems.minutes,
  position: planItems.position,
};

/** R11.1. The plan for one gathering, or null where nobody has started it. */
export async function getPlan(db: Tx, occurrenceId: string): Promise<ServicePlan | null> {
  const [row] = await db
    .select({
      id: servicePlans.id,
      occurrenceId: servicePlans.occurrenceId,
      title: servicePlans.title,
      series: servicePlans.series,
      theme: servicePlans.theme,
      serviceName: serviceOccurrences.name,
      occursOn: sql<string>`${serviceOccurrences.occursOn}::text`,
      serviceStartsAt: serviceOccurrences.startsAt,
    })
    .from(servicePlans)
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servicePlans.occurrenceId))
    .where(eq(servicePlans.occurrenceId, occurrenceId))
    .limit(1);
  if (!row) return null;

  const rows = await db
    .select(COLUMNS)
    .from(planItems)
    .where(eq(planItems.planId, row.id))
    .orderBy(asc(planItems.position), asc(planItems.createdAt));

  const timed = runningTimes(
    row.serviceStartsAt,
    rows.map((r) => ({ ...r, kind: r.kind as ItemKind })),
  );

  return { ...row, items: timed.items, minutes: timed.minutes, endsAt: timed.endsAt };
}

/**
 * R11.1. The plan, creating it the first time somebody opens the editor.
 *
 * Created on first edit rather than with the gathering, because a church that
 * generates a year of services does not want a year of empty plans in every
 * list and every export.
 */
export async function ensurePlan(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string,
): Promise<ServicePlan> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");

  const existing = await getPlan(db, occurrenceId);
  if (existing) return existing;

  const [occurrence] = await db
    .select({ id: serviceOccurrences.id })
    .from(serviceOccurrences)
    .where(eq(serviceOccurrences.id, occurrenceId))
    .limit(1);
  if (!occurrence) throw new InvalidInputError("order.error.service");

  await db
    .insert(servicePlans)
    .values({ tenantId: actor.tenantId, occurrenceId })
    .onConflictDoNothing();

  return (await getPlan(db, occurrenceId))!;
}

export async function updatePlan(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: PlanInput,
): Promise<void> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");

  const changed = await db
    .update(servicePlans)
    .set({
      title: input.title?.trim() || null,
      series: input.series?.trim() || null,
      theme: input.theme?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(servicePlans.id, id))
    .returning({ id: servicePlans.id });
  if (changed.length === 0) throw new InvalidInputError("order.error.missing");
}

function checkItem(input: ItemInput): { title: string; minutes: number; kind: ItemKind } {
  const title = input.title?.trim();
  if (!title) throw new InvalidInputError("order.error.title");
  if (!ITEM_KINDS.includes(input.kind)) throw new InvalidInputError("order.error.kind");
  if (!Number.isInteger(input.minutes) || input.minutes < 0 || input.minutes > 600) {
    throw new InvalidInputError("order.error.minutes");
  }
  return { title, minutes: input.minutes, kind: input.kind };
}

/** R11.2. A line on the plan, added at the end. */
export async function addItem(
  db: Tx,
  actor: WriteActor,
  planId: string,
  input: ItemInput,
): Promise<{ id: string }> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");
  const values = checkItem(input);

  const [last] = await db
    .select({ at: sql<number>`coalesce(max(${planItems.position}), -1)::int` })
    .from(planItems)
    .where(eq(planItems.planId, planId));

  const [row] = await db
    .insert(planItems)
    .values({
      tenantId: actor.tenantId,
      planId,
      ...values,
      description: input.description?.trim() || null,
      position: (last?.at ?? -1) + 1,
    })
    .returning({ id: planItems.id });

  return { id: row!.id };
}

export async function updateItem(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: ItemInput,
): Promise<void> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");
  const values = checkItem(input);

  const changed = await db
    .update(planItems)
    .set({
      ...values,
      description: input.description?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(planItems.id, id))
    .returning({ id: planItems.id });
  if (changed.length === 0) throw new InvalidInputError("order.error.item");
}

export async function removeItem(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");

  const gone = await db
    .delete(planItems)
    .where(eq(planItems.id, id))
    .returning({ id: planItems.id });
  if (gone.length === 0) throw new InvalidInputError("order.error.item");
}

/** R11.2. The order, which is the whole document. */
export async function reorderItems(
  db: Tx,
  actor: WriteActor,
  planId: string,
  ids: string[],
): Promise<void> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");

  for (const [index, id] of ids.entries()) {
    await db
      .update(planItems)
      .set({ position: index, updatedAt: new Date() })
      .where(and(eq(planItems.id, id), eq(planItems.planId, planId)));
  }
}

/** Moves one item up or down by one, which is how a plan is actually reordered. */
export async function moveItem(
  db: Tx,
  actor: WriteActor,
  input: { planId: string; id: string; direction: "up" | "down" },
): Promise<void> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");

  const rows = await db
    .select({ id: planItems.id })
    .from(planItems)
    .where(eq(planItems.planId, input.planId))
    .orderBy(asc(planItems.position), asc(planItems.createdAt));

  const order = rows.map((r) => r.id);
  const at = order.indexOf(input.id);
  if (at === -1) throw new InvalidInputError("order.error.item");

  const to = input.direction === "up" ? at - 1 : at + 1;
  if (to < 0 || to >= order.length) return;

  [order[at], order[to]] = [order[to]!, order[at]!];
  await reorderItems(db, actor, input.planId, order);
}
