"use server";

import { revalidatePath } from "next/cache";
import { withTenant, dismissAnnouncement } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/**
 * R16.11. A member takes a notice off their own screen.
 *
 * Theirs alone. The notice stays on the board and on everybody else's feed,
 * so a church does not have to take one down early because the people who
 * have read it are tired of it.
 */
export async function putNoticeAway(
  id: string,
  church?: string,
): Promise<{ error?: string }> {
  const session = await requireSession(church);
  try {
    await withTenant(
      { tenantId: session.tenantId, role: session.role, userId: session.userId },
      (tx) => dismissAnnouncement(tx, session, id),
    );
    revalidatePath("/home");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
