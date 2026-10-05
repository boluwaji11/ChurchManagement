"use server";

import {
  withTenant, getChurch, enterPipeline, exitPipeline, completeFollowUp, reopenFollowUp,
  addTask, assignFollowUp, setEntryStage,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";

export interface FollowUpResult {
  error?: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    session,
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
  };
}

/** R5.4. Putting somebody in a pipeline by hand. */
export async function startFollowUp(data: FormData): Promise<FollowUpResult> {
  const { session, ctx } = await context(field(data, "church") || undefined);
  try {
    await withTenant(ctx, async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const today = churchNow(profile?.timezone ?? "America/Chicago").date;
      return enterPipeline(tx, ctx, {
        pipelineId: field(data, "pipelineId"),
        memberId: field(data, "memberId"),
        on: today,
        assigneeUserId: session.userId,
      });
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R5.1. A step answered. */
export async function finishStep(
  id: string,
  outcome: string | null,
  church?: string,
): Promise<FollowUpResult> {
  const { ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => completeFollowUp(tx, ctx, { id, outcome }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R5.5. A card dragged to a stage, forwards or back. */
export async function moveToStage(
  entryId: string,
  position: number,
  church?: string,
): Promise<FollowUpResult> {
  const { ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setEntryStage(tx, ctx, entryId, position));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function undoStep(id: string, church?: string): Promise<FollowUpResult> {
  const { ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => reopenFollowUp(tx, ctx, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R5.4. Coming out, with the reason kept. */
export async function leaveFollowUp(
  entryId: string,
  reason: string,
  church?: string,
): Promise<FollowUpResult> {
  const { ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => exitPipeline(tx, ctx, { entryId, reason }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R5.6. A thing to do about somebody, attached to no pipeline. */
export async function addPersonTask(data: FormData): Promise<FollowUpResult> {
  const { session, ctx } = await context(field(data, "church") || undefined);
  try {
    await withTenant(ctx, (tx) =>
      addTask(tx, ctx, {
        memberId: field(data, "memberId"),
        title: field(data, "title"),
        dueOn: field(data, "dueOn") || null,
        assigneeUserId: session.userId,
      }),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R5.1. Taking a step on, or handing it back. */
export async function takeStep(
  id: string,
  mine: boolean,
  church?: string,
): Promise<FollowUpResult> {
  const { session, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      assignFollowUp(tx, ctx, { id, assigneeUserId: mine ? session.userId : null }),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
