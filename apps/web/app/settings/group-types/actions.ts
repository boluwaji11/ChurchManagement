"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, addGroupType, updateGroupType, setGroupTypeArchived, reorderGroupTypes,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface TypeResult {
  error?: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    actor: { tenantId: session.tenantId, role: session.role },
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
  };
}

/** R9.1. Writing a kind of group down, or changing one. */
export async function saveType(data: FormData): Promise<TypeResult> {
  const { actor, ctx } = await context(field(data, "church") || undefined);
  const id = field(data, "id");
  const input = {
    name: field(data, "name"),
    hue: field(data, "hue") || "sky",
    description: field(data, "description") || null,
  };

  try {
    await withTenant(ctx, (tx) =>
      id ? updateGroupType(tx, actor, id, input) : addGroupType(tx, actor, input).then(() => {}),
    );
    revalidatePath("/settings/group-types");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R9.1. Taking a kind off the list new groups choose from, or putting it back. */
export async function archiveType(
  id: string,
  archived: boolean,
  church?: string,
): Promise<TypeResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setGroupTypeArchived(tx, actor, id, archived));
    revalidatePath("/settings/group-types");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R9.1. The order they appear in everywhere a kind is chosen. */
export async function reorderTypes(ids: string[], church?: string): Promise<TypeResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => reorderGroupTypes(tx, actor, ids));
    revalidatePath("/settings/group-types");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
