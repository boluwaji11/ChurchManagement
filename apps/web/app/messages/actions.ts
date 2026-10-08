"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, writeMessage, markThreadRead, setThreadArchived,
  canEditPeople, PermissionError,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

/**
 * R16.9. The office's side of a thread.
 *
 * Whoever is on staff answers, and the thread stays with the church rather
 * than with whoever happened to reply.
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

export async function replyToMember(
  memberId: string,
  body: string,
  church?: string,
): Promise<{ error?: string }> {
  try {
    const ctx = await context(church);
    await withTenant(ctx, (tx) =>
      writeMessage(tx, ctx, { memberId, side: "church", body }),
    );
    revalidatePath("/messages");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R16.9. Opening a thread is reading it. */
export async function readThread(
  id: string,
  church?: string,
): Promise<{ error?: string }> {
  try {
    const ctx = await context(church);
    await withTenant(ctx, (tx) => markThreadRead(tx, id, "church"));
    revalidatePath("/messages");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.13. Off the list, kept in the records. A reply brings it back. */
export async function archiveThread(
  id: string,
  archived: boolean,
  church?: string,
): Promise<{ error?: string }> {
  try {
    const ctx = await context(church);
    await withTenant(ctx, (tx) => setThreadArchived(tx, ctx, id, archived));
    revalidatePath("/messages");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
