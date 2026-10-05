"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { withTenant, mergePeople, undoMerge, type MergePlan } from "@hearth/db";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

export interface MergeOutcome {
  error?: string;
  moved?: number;
  restored?: number;
}

async function context(slug: string | undefined) {
  const session = await requireSession(slug);
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    session,
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    },
  };
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/**
 * Merges two records, in one transaction.
 *
 * A merge that half happened is the worst outcome available: half the notes on
 * one record, half on the other, and no way to tell which half.
 */
export async function merge(data: FormData): Promise<MergeOutcome> {
  const winnerId = field(data, "winnerId");
  const loserId = field(data, "loserId");
  if (!winnerId || !loserId) return { error: "merge.error.notFound" };

  // Which record's value wins, per field, as chosen on the review screen.
  const take: MergePlan["take"] = {};
  for (const key of ["firstName", "lastName", "preferredName", "dateOfBirth", "lifecycleStatus", "membershipDate", "firstVisitOn"] as const) {
    if (field(data, `take.${key}`) === "loser") take[key] = "loser";
  }

  const { session, ctx } = await context(field(data, "church") || undefined);
  try {
    const result = await withTenant(ctx, (tx) =>
      mergePeople(tx, { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions }, {
        winnerId,
        loserId,
        take,
      }),
    );
    revalidatePath("/duplicates");
    revalidatePath("/members");
    return { moved: result.movedRows };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function undo(data: FormData): Promise<MergeOutcome> {
  const mergeId = field(data, "mergeId");
  if (!mergeId) return { error: "merge.error.notFound" };

  const { session, ctx } = await context(field(data, "church") || undefined);
  try {
    const result = await withTenant(ctx, (tx) =>
      undoMerge(tx, { tenantId: session.tenantId, role: session.role }, mergeId),
    );
    revalidatePath("/duplicates");
    revalidatePath("/members");
    return { restored: result.restoredRows };
  } catch (error) {
    return { error: explain(error) };
  }
}
