"use server";

import {
  withTenant, liveFor, startLive, moveLive, goLiveTo, stopLive, type LiveState,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context() {
  const session = await requireSession();
  return {
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
  };
}

export interface LiveResult {
  error?: string;
}

/**
 * R11.11. What the service is on, asked for again every few seconds.
 *
 * Polled rather than pushed, because realtime is unused in v1 and a phone
 * asking every three seconds is well inside the time it takes somebody to
 * notice a song has ended.
 */
export async function liveNow(
  occurrenceId: string,
  ): Promise<LiveState | null> {
  const { ctx } = await context();
  try {
    return await withTenant(ctx, (tx) => liveFor(tx, occurrenceId));
  } catch {
    return null;
  }
}

export async function begin(occurrenceId: string): Promise<LiveResult> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) => startLive(tx, actor, occurrenceId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function move(
  occurrenceId: string,
  direction: "next" | "back",
  ): Promise<LiveResult> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) => moveLive(tx, actor, occurrenceId, direction));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function jumpTo(
  occurrenceId: string,
  itemId: string,
  ): Promise<LiveResult> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) => goLiveTo(tx, actor, occurrenceId, itemId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function end(occurrenceId: string): Promise<LiveResult> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, (tx) => stopLive(tx, actor, occurrenceId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
