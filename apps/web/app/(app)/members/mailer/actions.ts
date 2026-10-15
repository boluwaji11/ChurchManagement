"use server";

import {
  withTenant, createMailer, updateMailer, setMailerArchived,
  canEditPeople, PermissionError,
  type MailerPatch,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/**
 * R16.12. Writing down what the mailer screen has become.
 *
 * It saves on a timer rather than on a button, so these are called while
 * somebody is still typing. Each one answers with a sentence instead of
 * throwing, because the screen has to keep taking words whatever the last
 * write did.
 */
async function context() {
  const session = await requireSession();
  if (!canEditPeople(session)) throw new PermissionError(session.role, "editPerson");
  return {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
}

export async function startMailer(
  name: string,
  ): Promise<{ slug?: string; error?: string }> {
  try {
    const ctx = await context();
    const made = await withTenant(ctx, (tx) => createMailer(tx, ctx, { name }));
    return { slug: made.slug };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveMailer(
  patch: MailerPatch,
  ): Promise<{ error?: string }> {
  try {
    const ctx = await context();
    await withTenant(ctx, (tx) => updateMailer(tx, ctx, patch));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.13. Taken off the shelf, kept in the records. */
export async function archiveMailer(
  id: string,
  archived: boolean,
  ): Promise<{ error?: string }> {
  try {
    const ctx = await context();
    await withTenant(ctx, (tx) => setMailerArchived(tx, ctx, id, archived));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
