import { and, asc, eq } from "drizzle-orm";
import type { Tx } from "../client";
import { servicePlans, planItems } from "../schema/plans";
import { serviceOccurrences } from "../schema/gatherings";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageServices } from "./services";
import type { ItemKind } from "./plans";
import type { WriteActor } from "./people";

/**
 * R11.11. Live mode: what the gathering is on right now.
 *
 * The state is a row rather than something held in the leader's browser,
 * because the point is that the team is following on their own phones. A tab
 * is not somewhere eight people can read from.
 *
 * Nothing here is realtime. The phone asks every few seconds, which is well
 * inside the time it takes a person to notice a song has ended, and it costs a
 * church nothing to run.
 */

export interface LiveItem {
  id: string;
  kind: ItemKind;
  title: string;
  description: string | null;
  minutes: number;
}

export interface LiveState {
  planId: string;
  occurrenceId: string;
  serviceName: string;
  occursOn: string;
  /** The planned start, as HH:MM. */
  startsAt: string;
  /** True once somebody has started it. */
  running: boolean;
  /** When the gathering was started, and when the current item was reached. */
  startedAt: string | null;
  itemAt: string | null;
  currentId: string | null;
  items: LiveItem[];
}

/** R11.11. What the gathering is on, and everything it runs through. */
export async function liveFor(db: Tx, occurrenceId: string): Promise<LiveState | null> {
  const [plan] = await db
    .select({
      planId: servicePlans.id,
      occurrenceId: servicePlans.occurrenceId,
      currentId: servicePlans.liveItemId,
      startedAt: servicePlans.liveStartedAt,
      itemAt: servicePlans.liveItemAt,
      serviceName: serviceOccurrences.name,
      occursOn: serviceOccurrences.occursOn,
      startsAt: serviceOccurrences.startsAt,
    })
    .from(servicePlans)
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, servicePlans.occurrenceId))
    .where(eq(servicePlans.occurrenceId, occurrenceId))
    .limit(1);
  if (!plan) return null;

  const rows = await db
    .select({
      id: planItems.id,
      kind: planItems.kind,
      title: planItems.title,
      description: planItems.description,
      minutes: planItems.minutes,
    })
    .from(planItems)
    .where(eq(planItems.planId, plan.planId))
    .orderBy(asc(planItems.position), asc(planItems.createdAt));

  return {
    planId: plan.planId,
    occurrenceId: plan.occurrenceId,
    serviceName: plan.serviceName,
    occursOn: String(plan.occursOn),
    startsAt: plan.startsAt,
    running: plan.startedAt !== null,
    startedAt: plan.startedAt?.toISOString() ?? null,
    itemAt: plan.itemAt?.toISOString() ?? null,
    currentId: plan.currentId,
    items: rows.map((r) => ({ ...r, kind: r.kind as ItemKind })),
  };
}

async function planFor(db: Tx, occurrenceId: string) {
  const [plan] = await db
    .select({ id: servicePlans.id, currentId: servicePlans.liveItemId })
    .from(servicePlans)
    .where(eq(servicePlans.occurrenceId, occurrenceId))
    .limit(1);
  if (!plan) throw new InvalidInputError("order.error.missing");
  return plan;
}

async function itemIds(db: Tx, planId: string): Promise<string[]> {
  const rows = await db
    .select({ id: planItems.id })
    .from(planItems)
    .where(eq(planItems.planId, planId))
    .orderBy(asc(planItems.position), asc(planItems.createdAt));
  return rows.map((r) => r.id);
}

/**
 * R11.11. Starts the gathering on its first item.
 *
 * Starting an empty plan is refused: there is nothing to be on, and a clock
 * running against nothing tells a leader nothing.
 */
export async function startLive(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string,
): Promise<void> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");
  const plan = await planFor(db, occurrenceId);

  const ids = await itemIds(db, plan.id);
  if (ids.length === 0) throw new InvalidInputError("live.error.empty");

  const now = new Date();
  await db
    .update(servicePlans)
    .set({ liveItemId: ids[0], liveStartedAt: now, liveItemAt: now, updatedAt: now })
    .where(eq(servicePlans.id, plan.id));
}

/**
 * R11.11. Moves to the next item, or back to the one before.
 *
 * Going on from the last item ends the gathering, because that is what pressing
 * next at the end means. Going back from the first stays where it is.
 */
export async function moveLive(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string,
  direction: "next" | "back",
): Promise<{ currentId: string | null }> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");
  const plan = await planFor(db, occurrenceId);

  const ids = await itemIds(db, plan.id);
  const at = plan.currentId ? ids.indexOf(plan.currentId) : -1;
  if (at === -1) throw new InvalidInputError("live.error.stopped");

  const now = new Date();
  const to = direction === "next" ? at + 1 : Math.max(at - 1, 0);

  if (to >= ids.length) {
    await stopLive(db, actor, occurrenceId);
    return { currentId: null };
  }

  await db
    .update(servicePlans)
    .set({ liveItemId: ids[to], liveItemAt: now, updatedAt: now })
    .where(eq(servicePlans.id, plan.id));
  return { currentId: ids[to]! };
}

/** R11.11. Jumps straight to an item, for when the order changes on the floor. */
export async function goLiveTo(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string,
  itemId: string,
): Promise<void> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");
  const plan = await planFor(db, occurrenceId);

  const [item] = await db
    .select({ id: planItems.id })
    .from(planItems)
    .where(and(eq(planItems.id, itemId), eq(planItems.planId, plan.id)))
    .limit(1);
  if (!item) throw new InvalidInputError("order.error.item");

  const now = new Date();
  await db
    .update(servicePlans)
    .set({ liveItemId: itemId, liveItemAt: now, updatedAt: now })
    .where(eq(servicePlans.id, plan.id));
}

/** R11.11. Ends it. The plan itself is untouched. */
export async function stopLive(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string,
): Promise<void> {
  if (!canManageServices(actor.role)) throw new PermissionError(actor.role, "managePlans");
  const plan = await planFor(db, occurrenceId);

  await db
    .update(servicePlans)
    .set({
      liveItemId: null,
      liveStartedAt: null,
      liveItemAt: null,
      updatedAt: new Date(),
    })
    .where(eq(servicePlans.id, plan.id));
}
