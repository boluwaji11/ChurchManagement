"use server";

import { withTenant, recordCheck, type CheckResult } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface CheckResultView {
  error?: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

/** R2.10. Writing a check down. There is no edit and no delete. */
export async function addCheck(data: FormData): Promise<CheckResultView> {
  const session = await requireSession(field(data, "church") || undefined);
  const ctx = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };

  try {
    await withTenant(ctx, (tx) =>
      recordCheck(tx, ctx, {
        personId: field(data, "personId"),
        provider: field(data, "provider"),
        status: field(data, "status") as CheckResult,
        completedOn: field(data, "completedOn") || null,
        expiresOn: field(data, "expiresOn") || null,
      }),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
