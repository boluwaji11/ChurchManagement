"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, bulkSetArchived, bulkSetStatus, bulkSetPersonTag,
  type LifecycleStatus,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

export interface BulkResult {
  error?: string;
  changed?: number;
}

async function context(slug: string | undefined) {
  const session = await requireSession(slug);
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    actor: { tenantId: session.tenantId, role: session.role },
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    },
  };
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const selection = (data: FormData) => data.getAll("ids").map(String).filter(Boolean);

/**
 * Bulk actions take the ids that were on screen, never the filter.
 *
 * A bulk action driven by "whatever the filter matched" does something different
 * from what the person was looking at the moment anything changes underneath
 * them, and what they were looking at is what they meant.
 */
export async function bulkArchive(data: FormData): Promise<BulkResult> {
  const ids = selection(data);
  if (ids.length === 0) return { changed: 0 };

  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    const changed = await withTenant(ctx, (tx) =>
      bulkSetArchived(tx, actor, ids, field(data, "archived") === "1"),
    );
    revalidatePath("/people");
    return { changed };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function bulkStatus(data: FormData): Promise<BulkResult> {
  const ids = selection(data);
  const status = field(data, "status") as LifecycleStatus;
  if (ids.length === 0) return { changed: 0 };
  if (!status) return { error: t("error.chooseType") };

  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    const changed = await withTenant(ctx, (tx) => bulkSetStatus(tx, actor, ids, status));
    revalidatePath("/people");
    return { changed };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function bulkTag(data: FormData): Promise<BulkResult> {
  const ids = selection(data);
  const tagId = field(data, "tagId");
  const on = field(data, "on") === "1";
  if (ids.length === 0) return { changed: 0 };
  if (!tagId) return { error: t("error.notFound.tag") };

  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    const changed = await withTenant(ctx, (tx) => bulkSetPersonTag(tx, actor, ids, tagId, on));
    revalidatePath("/people");
    return { changed };
  } catch (error) {
    return { error: explain(error) };
  }
}
