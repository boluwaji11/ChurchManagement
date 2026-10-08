"use server";

import { revalidatePath } from "next/cache";
import { withTenant, writeFund, setFundArchived } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface FundResult {
  error?: string;
}

async function context(church?: string) {
  const session = await requireSession(church);
  const who = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  return { actor: who, ctx: who };
}

/** R13.9. Writing a fund down, or changing one. */
export async function saveFund(
  input: { id?: string; name: string; code?: string | null; restricted?: boolean; description?: string | null },
  church?: string,
): Promise<FundResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => writeFund(tx, actor, input));
    revalidatePath("/settings/funds");
    revalidatePath("/giving");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.9. Taking a fund off the list of causes, or putting it back. */
export async function archiveFund(
  id: string,
  archived: boolean,
  church?: string,
): Promise<FundResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setFundArchived(tx, actor, id, archived));
    revalidatePath("/settings/funds");
    revalidatePath("/giving");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
