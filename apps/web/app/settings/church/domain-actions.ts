"use server";

import { revalidatePath } from "next/cache";
import { withTenant, setCustomDomain, setSelfSignup } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

export interface DomainResult {
  domain?: string | null;
  error?: string;
}

/** R1.1. The church's own address, set or cleared. */
export async function saveDomain(domain: string, church?: string): Promise<DomainResult> {
  try {
    const session = await requireSession(church);
    const saved = await withTenant(
      {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
        permissions: session.permissions,
      },
      (tx) =>
        setCustomDomain(
          tx,
          { tenantId: session.tenantId, role: session.role, userId: session.userId },
          { domain: domain.trim() || null },
        ),
    );
    revalidatePath("/settings/church");
    return { domain: saved };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.7. Opening or shutting the church's own door to new accounts. */
export async function setSignup(open: boolean, church?: string): Promise<{ error?: string }> {
  try {
    const session = await requireSession(church);
    await setSelfSignup(session.tenantId, session.role, open);
    revalidatePath("/settings/church");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
