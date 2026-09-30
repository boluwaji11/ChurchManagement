"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { withTenant, revokeSession, revokeOtherSessions } from "@hearth/db";
import { requireSession, currentSessionId } from "@/lib/session";
import { t } from "@hearth/i18n";
import { explain } from "@/lib/explain";

export interface SessionResult {
  error?: string;
  ended?: number;
}

async function context(slug: string | undefined) {
  const session = await requireSession(slug);
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
  };
}

export async function endSession(data: FormData): Promise<SessionResult> {
  const slug = String(data.get("church") ?? "") || undefined;
  const id = String(data.get("id") ?? "");
  if (!id) return { error: t("session.error.notFound") };

  try {
    const ended = await withTenant(await context(slug), (tx) => revokeSession(tx, id));
    revalidatePath("/account");
    // Zero for somebody else's session and zero for one that has already
    // expired. Reporting them differently would confirm that an id exists.
    return ended === 0 ? { error: t("session.error.notFound") } : { ended };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function endOtherSessions(data: FormData): Promise<SessionResult> {
  const slug = String(data.get("church") ?? "") || undefined;
  const keep = await currentSessionId();
  if (!keep) return { error: t("session.error.notFound") };

  try {
    const ended = await withTenant(await context(slug), (tx) => revokeOtherSessions(tx, keep));
    revalidatePath("/account");
    return { ended };
  } catch (error) {
    return { error: explain(error) };
  }
}
