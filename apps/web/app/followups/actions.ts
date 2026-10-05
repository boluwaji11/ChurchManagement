"use server";

import {
  withTenant, getChurch, peopleNotIn, enterPipeline, setEntryStage,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    session,
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
  };
}

/** R5.4. People a church could put on this board, narrowed by what was typed. */
export async function findPeople(
  pipelineId: string,
  search: string,
  church?: string,
): Promise<{ id: string; name: string }[]> {
  const { ctx } = await context(church);
  return withTenant(ctx, (tx) => peopleNotIn(tx, pipelineId, search));
}

/**
 * R5.4, R5.5. Putting somebody straight into a column.
 *
 * They enter the pipeline the normal way, with every step written out and
 * dated, and are then moved to the column they were dropped into, which marks
 * the steps before it as answered. A church adding somebody to the third column
 * is saying the first two already happened.
 */
export async function addToStage(
  pipelineId: string,
  memberId: string,
  position: number,
  church?: string,
): Promise<{ error?: string }> {
  const { session, ctx } = await context(church);
  try {
    await withTenant(ctx, async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const today = churchNow(profile?.timezone ?? "America/Chicago").date;
      const entry = await enterPipeline(tx, ctx, {
        pipelineId,
        memberId,
        on: today,
        assigneeUserId: session.userId,
      });
      if (entry && position > 0) await setEntryStage(tx, ctx, entry.id, position);
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
