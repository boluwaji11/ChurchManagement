"use server";

import { revalidatePath } from "next/cache";
import { withTenant, setStatementsBy } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/** R13.18. One statement a person, or one a household. */
export async function chooseStatementsBy(
  by: "person" | "household",
  church?: string,
): Promise<{ error?: string }> {
  const session = await requireSession(church);
  const who = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  try {
    await withTenant(who, (tx) => setStatementsBy(tx, who, by));
    revalidatePath("/giving/statements");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
