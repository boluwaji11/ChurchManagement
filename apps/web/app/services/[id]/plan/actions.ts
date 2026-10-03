"use server";

import {
  withTenant, ensurePlan, updatePlan, addItem, updateItem, removeItem, moveItem,
  type ItemKind,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId },
  };
}

export interface PlanResult {
  error?: string;
}

export interface ItemFields {
  kind: ItemKind;
  title: string;
  description: string | null;
  minutes: number;
}

export async function saveHeader(
  planId: string,
  input: { series: string | null; theme: string | null },
  church?: string,
): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => updatePlan(tx, actor, planId, input));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveItem(
  planId: string,
  id: string | null,
  input: ItemFields,
  church?: string,
): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, async (tx) => {
      if (id) await updateItem(tx, actor, id, input);
      else await addItem(tx, actor, planId, input);
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropItem(id: string, church?: string): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeItem(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function shiftItem(
  planId: string,
  id: string,
  direction: "up" | "down",
  church?: string,
): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => moveItem(tx, actor, { planId, id, direction }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R11.1. Opening the editor is what creates the plan. */
export async function startPlan(occurrenceId: string, church?: string): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => ensurePlan(tx, actor, occurrenceId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
