"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, saveEmailTemplate, archiveEmailTemplate,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/**
 * HRT-291, R16.4. Writing down a message a church sends every year.
 */

async function context() {
  const session = await requireSession();
  return {
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId },
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
  };
}

export interface Saved {
  error?: string;
  id?: string;
}

export async function keepTemplate(data: FormData): Promise<Saved> {
  const { ctx, actor } = await context();
  try {
    const id = await withTenant(ctx, (tx) =>
      saveEmailTemplate(tx, actor, {
        id: String(data.get("id") ?? "") || null,
        name: String(data.get("name") ?? ""),
        subject: String(data.get("subject") ?? ""),
        body: String(data.get("body") ?? ""),
      }),
    );
    revalidatePath("/settings/email-templates");
    revalidatePath("/members/email");
    return { id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function putAwayTemplate(id: string, away: boolean): Promise<Saved> {
  const { ctx, actor } = await context();
  try {
    await withTenant(ctx, (tx) => archiveEmailTemplate(tx, actor, id, away));
    revalidatePath("/settings/email-templates");
    revalidatePath("/members/email");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
