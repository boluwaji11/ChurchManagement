"use server";

import { withTenant, markGuardianNotified } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/** R8.13. Recording that the guardian has now been told. */
export async function told(id: string, church?: string): Promise<{ error?: string }> {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role };

  try {
    await withTenant({ ...actor, userId: session.userId }, (tx) =>
      markGuardianNotified(tx, actor, id, session.userId),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
