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
async function context(church?: string) {
  const session = await requireSession(church);
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
  church?: string,
): Promise<{ id?: string; error?: string }> {
  try {
    const ctx = await context(church);
    const made = await withTenant(ctx, (tx) => createMailer(tx, ctx, { name }));
    return { id: made.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveMailer(
  patch: MailerPatch,
  church?: string,
): Promise<{ error?: string }> {
  try {
    const ctx = await context(church);
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
  church?: string,
): Promise<{ error?: string }> {
  try {
    const ctx = await context(church);
    await withTenant(ctx, (tx) => setMailerArchived(tx, ctx, id, archived));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
