"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, addItemKind, renameItemKind, setItemKindArchived,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface KindResult {
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

/** R11.2. A kind this church runs, or the church's word over one of ours. */
export async function saveKind(
  input: { id?: string; name?: string; builtIn?: string },
  church?: string,
): Promise<KindResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      input.id
        ? renameItemKind(tx, actor, input.id, input.name ?? "")
        : addItemKind(tx, actor, { name: input.name, builtIn: input.builtIn }).then(() => {}),
    );
    revalidatePath("/settings/item-kinds");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R11.2. Taking a kind off the list, or putting it back. */
export async function archiveKind(
  id: string,
  archived: boolean,
  church?: string,
): Promise<KindResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setItemKindArchived(tx, actor, id, archived));
    revalidatePath("/settings/item-kinds");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
