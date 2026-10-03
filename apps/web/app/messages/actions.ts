"use server";

import {
  withTenant, listMessageTemplates, saveMessageTemplate, removeMessageTemplate,
  type TemplateInput,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId },
  };
}

export interface ComposeResult {
  error?: string;
  id?: string;
}

/** R16.4. Keeps a message worth sending again. */
export async function keepTemplate(
  input: TemplateInput,
  id: string | null,
  church?: string,
): Promise<ComposeResult> {
  const { actor, ctx } = await context(church);
  try {
    const saved = await withTenant(ctx, (tx) => saveMessageTemplate(tx, actor, input, id));
    return { id: saved.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropTemplate(id: string, church?: string): Promise<ComposeResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeMessageTemplate(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function templates(church?: string) {
  const { ctx } = await context(church);
  return withTenant(ctx, (tx) => listMessageTemplates(tx));
}
