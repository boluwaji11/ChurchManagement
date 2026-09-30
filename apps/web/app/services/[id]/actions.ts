"use server";

import { headers } from "next/headers";
import { withTenant, setPresent, setPresentMany } from "@hearth/db";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

export interface RosterResult {
  error?: string;
}

async function writeContext(slug: string | undefined) {
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

/**
 * One tick.
 *
 * Deliberately without revalidatePath. The roster is held in the page and the
 * tick is already drawn; refetching the whole list on every press is what makes
 * a tablet feel like it is thinking, and 120 of those is the three minutes the
 * acceptance criterion gives us.
 */
export async function markPresent(data: FormData): Promise<RosterResult> {
  const slug = String(data.get("church") ?? "") || undefined;
  const { session, ctx } = await writeContext(slug);

  try {
    await withTenant(ctx, (tx) =>
      setPresent(
        tx,
        { tenantId: session.tenantId, role: session.role },
        String(data.get("occurrenceId") ?? ""),
        String(data.get("personId") ?? ""),
        String(data.get("present") ?? "") === "1",
      ),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function markManyPresent(data: FormData): Promise<RosterResult> {
  const slug = String(data.get("church") ?? "") || undefined;
  const { session, ctx } = await writeContext(slug);

  try {
    await withTenant(ctx, (tx) =>
      setPresentMany(
        tx,
        { tenantId: session.tenantId, role: session.role },
        String(data.get("occurrenceId") ?? ""),
        data.getAll("personId").map(String),
        String(data.get("present") ?? "") === "1",
      ),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
