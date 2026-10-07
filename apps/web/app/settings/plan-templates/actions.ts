"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, writeTemplate, setTemplateArchived, type ShapeInput,
} from "@connectapp/db";
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

/** R11.8. Taking a shape off the list, or putting it back. */
export async function archiveTemplate(
  id: string,
  archived: boolean,
  church?: string,
): Promise<TemplateResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setTemplateArchived(tx, actor, id, archived));
    revalidatePath("/settings/plan-templates");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
