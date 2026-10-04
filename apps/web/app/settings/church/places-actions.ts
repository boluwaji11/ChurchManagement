"use server";

import { withTenant, renameCampus } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface PlaceResult {
  error?: string;
}

/** R1.2. The one campus this church meets at, named. */
export async function renameSite(
  id: string,
  name: string,
  church?: string,
): Promise<PlaceResult> {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  try {
    await withTenant(actor, (tx) => renameCampus(tx, actor, id, name));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
