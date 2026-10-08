"use server";

import { revalidatePath } from "next/cache";
import { withTenant, writeMessage, memberForUser } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/**
 * R16.9, R17.1. A member writes to the church.
 *
 * Nothing leaves the product. The office reads it on its own inbox, which is
 * why this half of communication can exist in a product that holds nobody's
 * credentials.
 */
export async function writeToChurch(
  body: string,
  church?: string,
): Promise<{ error?: string }> {
  const session = await requireSession(church);
  try {
    await withTenant(
      { tenantId: session.tenantId, role: session.role, userId: session.userId },
      async (tx) => {
        const me = await memberForUser(tx, session.userId);
        if (!me) throw new Error(t("member.error.noRecord"));
        await writeMessage(
          tx,
          { tenantId: session.tenantId, role: session.role, userId: session.userId },
          { memberId: me, side: "member", body },
        );
      },
    );
    revalidatePath("/home/messages");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
