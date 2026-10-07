"use server";

import { revalidatePath } from "next/cache";
import { withTenant, writeTemplate, removeTemplate, type ShapeInput } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface TemplateResult {
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

/** R11.8. Writing a shape down, or changing one. */
export async function saveTemplate(
  input: { id?: string; name: string; items: ShapeInput[] },
  church?: string,
): Promise<TemplateResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => writeTemplate(tx, actor, input));
    revalidatePath("/settings/plan-templates");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R11.8. Deleting a shape. The plans built from it are untouched. */
export async function deleteTemplate(id: string, church?: string): Promise<TemplateResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeTemplate(tx, actor, id));
    revalidatePath("/settings/plan-templates");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
