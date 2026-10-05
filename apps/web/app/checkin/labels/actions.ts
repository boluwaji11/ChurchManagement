"use server";

import { withTenant, setLabelLayout, type LabelLayout } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/** R8.11. The church's label layout, saved. */
export async function saveLayout(
  layout: LabelLayout,
  church?: string,
): Promise<{ error?: string }> {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role };

  try {
    await withTenant({ ...actor, userId: session.userId }, (tx) =>
      setLabelLayout(tx, actor, layout),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
