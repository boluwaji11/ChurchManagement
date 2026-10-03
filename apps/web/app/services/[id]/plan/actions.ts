"use server";

import {
  withTenant, ensurePlan, updatePlan, addItem, updateItem, removeItem, moveItem,
  addItemNote, removeItemNote, detachFromItem,
  type ItemKind,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";

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

/** R11.6. A note on an item, addressed to everybody or to one position or person. */
export async function saveNote(
  input: {
    itemId: string;
    body: string;
    teamId: string | null;
    positionId: string | null;
    personId: string | null;
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
export async function fileLink(key: string): Promise<string | null> {
  await requireSession();
  const supabase = await supabaseServer();
  const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
  return signed.data?.signedUrl ?? null;
}
