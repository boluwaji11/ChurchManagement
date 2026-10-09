"use server";

import {
  withTenant, sendMessage, setThreadArchived, threadAt,
  saveDraft, dropDraft, peopleNamed, writableGroups, writableTeams,
  canAnswerMessages,
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
      const [kind, name] = to.includes("/") ? to.split("/") : [null, to];
      await sendMessage(tx, me, {
        to: to === "office"
          ? { office: true }
          : kind === "group"
            ? { office: false, group: name! }
            : kind === "team"
              ? { office: false, team: name! }
              : { office: false, slug: to },
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
  /** R9.7. Whether it reaches everybody in a group rather than one person. */
  whole?: boolean;
}

/** R16.9. The kinds of thing a message can be addressed to. */
export type WriteKind = "church" | "member" | "group" | "team";

/**
 * R16.9. What this reader may address a message to.
 *
 * Asked a kind at a time, because a church has three different lists and
 * putting them in one box made the office scroll past every group to reach a
 * name. Each list is what this reader may reach: the office looks anybody up
 * and writes to any group, a member reaches the groups and teams they are in
 * and whoever leads one of them.
 */
export async function whoToWriteTo(
  kind: WriteKind,
  query: string,
  church?: string,
): Promise<WriteTo[]> {
  try {
    const { session, ctx } = await context(church);
    return await withTenant(ctx, async (tx) => {
      const me = await readerFor(tx, session);

      if (kind === "group") {
        return (await writableGroups(tx, me)).map((one) => ({
          value: one.value, label: one.name, whole: true,
        }));
      }

      if (kind === "team") {
        return (await writableTeams(tx, me)).map((one) => ({
          value: one.value, label: one.name, whole: true,
        }));
      }

      /*
       * R16.9, R3.2. Only the office writes to a person by name.
       *
       * A member writes to the church, or to a group or team they are part
       * of. A directory of four hundred people in a To field would be the
       * church's own privacy settings undone by a message box.
       */
      if (!canAnswerMessages(session)) return [];

      return (await peopleNamed(tx, query)).map((one) => ({
        value: one.value, label: one.name, through: null,
      }));
    });
  } catch {
    return [];
  }
}

/** R16.9. Which kinds this reader may address, in the order they are offered. */
export async function kindsICanWriteTo(church?: string): Promise<WriteKind[]> {
  try {
    const { session } = await context(church);
    return canAnswerMessages(session)
      ? ["member", "group", "team"]
      : ["church", "group", "team"];
  } catch {
    return [];
  }
}
