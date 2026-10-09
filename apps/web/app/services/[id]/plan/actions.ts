"use server";

import {
  withTenant, ensurePlan, updatePlan, addItem, updateItem, removeItem, moveItem, reorderItems,
  addItemNote, removeItemNote, detachFromItem,
  templateItems, planItemsFor, type ShapeItem,
  saveAsTemplate, renameTemplate, removeTemplate, applyTemplate,
  type ItemKind, holdsFile,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
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
/** R11.2. The whole order, as dropped. One write rather than a run of swaps. */
export async function reorder(
  planId: string,
  ids: string[],
  church?: string,
): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => reorderItems(tx, actor, planId, ids));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function startPlan(occurrenceId: string, church?: string): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => ensurePlan(tx, actor, occurrenceId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R11.6. A note on an item, addressed to everybody or to one position or person. */
export async function saveNote(
  input: {
    itemId: string;
    body: string;
    teamId: string | null;
    positionId: string | null;
    memberId: string | null;
  },
  church?: string,
): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => addItemNote(tx, actor, input));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropNote(id: string, church?: string): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeItemNote(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R11.7. Takes a file off an item, and off the bucket.
 *
 * A file nothing points at is quota a church is paying for and cannot see.
 */
export async function dropFile(id: string, church?: string): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    const removed = await withTenant(ctx, (tx) => detachFromItem(tx, actor, id));
    if (removed) {
      const supabase = await supabaseServer();
      await supabase.storage.from("church").remove([removed.key]);
    }
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R11.7. A link to the file, signed, because the bucket is private. */
export async function fileLink(key: string, church?: string): Promise<string | null> {
  const { ctx } = await context(church);
  // R21.1. Signed only for a key this church's own ledger holds.
  const mine = await withTenant(ctx, (tx) => holdsFile(tx, key));
  if (!mine) return null;
  const supabase = await supabaseServer();
  const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
  return signed.data?.signedUrl ?? null;
}

/** R11.8. Saves the shape of this plan under a name, for next time. */
export async function keepAsTemplate(
  planId: string,
  name: string,
  church?: string,
): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => saveAsTemplate(tx, actor, { planId, name }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function renamePlanTemplate(
  id: string,
  name: string,
  church?: string,
): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => renameTemplate(tx, actor, id, name));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropTemplate(id: string, church?: string): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeTemplate(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R11.8. Lays a saved shape onto the plan, after whatever is already there. */
export async function useTemplate(
  planId: string,
  templateId: string,
  church?: string,
): Promise<PlanResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => applyTemplate(tx, actor, { planId, templateId }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R11.8. What a shape holds, read before it is pushed onto the plan. */
export async function shapeOf(
  source: { kind: "template"; id: string } | { kind: "plan"; occurrenceId: string },
  church?: string,
): Promise<{ items?: ShapeItem[]; error?: string }> {
  const { ctx } = await context(church);
  try {
    const items = await withTenant(ctx, (tx) =>
      source.kind === "template"
        ? templateItems(tx, source.id)
        : planItemsFor(tx, source.occurrenceId),
    );
    return { items };
  } catch (error) {
    return { error: explain(error) };
  }
}
