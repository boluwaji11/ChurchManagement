"use server";

import {
  withTenant, sendMessage, setThreadArchived, threadAt,
  saveDraft, dropDraft, recipientsFor, peopleNamed, canEditPeople,
  type Recipient,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { readerFor } from "@/lib/inbox";

/**
 * R16.9. Writing, reading and keeping what has not been sent.
 *
 * Every address here is a person rather than a row: "office", or whoever the
 * message is for. A link to a conversation is a link to somebody.
 */
async function context(church?: string) {
  const session = await requireSession(church);
  return {
    session,
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
  };
}

/** R16.9. A message, to the office or to whoever it names. */
export async function send(
  to: string,
  body: string,
  church?: string,
): Promise<{ key?: string; error?: string }> {
  try {
    const { session, ctx } = await context(church);
    return await withTenant(ctx, async (tx) => {
      const me = await readerFor(tx, session);
      await sendMessage(tx, me, {
        to: to === "office" ? { office: true } : { office: false, slug: to },
        body,
      });
      return { key: to };
    });
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.13. Off the list, kept in the records. A reply brings it back. */
export async function archiveThread(
  key: string,
  archived: boolean,
  church?: string,
): Promise<{ error?: string }> {
  try {
    const { session, ctx } = await context(church);
    await withTenant(ctx, async (tx) => {
      const me = await readerFor(tx, session);
      const thread = await threadAt(tx, me, key);
      if (thread) await setThreadArchived(tx, me, thread.id, archived);
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R16.9. What has been typed and not sent, kept as it is typed. */
export async function keepDraft(
  to: string,
  body: string,
  church?: string,
): Promise<{ error?: string }> {
  try {
    const { session, ctx } = await context(church);
    await withTenant(ctx, async (tx) => {
      const me = await readerFor(tx, session);
      await saveDraft(tx, me, to, body);
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R16.9. A draft thrown away. */
export async function binDraft(to: string, church?: string): Promise<{ error?: string }> {
  try {
    const { session, ctx } = await context(church);
    await withTenant(ctx, async (tx) => {
      const me = await readerFor(tx, session);
      await dropDraft(tx, me, to === "office" ? "office" : to);
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface WriteTo {
  value: string;
  label: string;
  /** Why they are on the list: the group or team they lead. */
  through?: string | null;
}

/**
 * R16.9. Who this reader may write to.
 *
 * Staff look anybody up, because answering a church's post is their work.
 * A member is offered the office and whoever leads something they are part
 * of: a directory of four hundred people in a To field is how somebody ends
 * up writing to a stranger.
 */
export async function whoToWriteTo(
  query: string,
  church?: string,
): Promise<WriteTo[]> {
  try {
    const { session, ctx } = await context(church);
    return await withTenant(ctx, async (tx) => {
      if (canEditPeople(session)) {
        const found = await peopleNamed(tx, query);
        return found.map((one) => ({ value: one.value, label: one.name, through: null }));
      }

      const me = await readerFor(tx, session);
      const mine: Recipient[] = await recipientsFor(tx, me);
      return mine.map((one) => ({
        value: one.value,
        label: one.name,
        through: one.through,
      }));
    });
  } catch {
    return [];
  }
}
