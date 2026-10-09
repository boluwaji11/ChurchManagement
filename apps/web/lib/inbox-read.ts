import {
  withTenant, inboxFor, sentFor, draftsFor, messagesIn, threadAt, markThreadRead,
  unreadFor, getChurch,
} from "@connectapp/db";
import { localeFor } from "@connectapp/i18n";
import { readerFor } from "@/lib/inbox";
import { heldPhotoUrls } from "@/lib/photos";
import type { Session } from "@/lib/session";
import type { InboxData } from "@/components/inbox/data";

/**
 * R16.9. What the inbox says, read once.
 *
 * The same answer whether the page is being rendered on its way to the browser
 * or the panel is asking again a few seconds later, so the screen a reader
 * first sees is already filled: a screen that paints "No messages" and then
 * fills itself in reads as broken, however fast it is.
 */
export async function readInbox(
  session: Session,
  opts: {
    view?: string;
    key?: string | null;
    archived?: boolean;
    /**
     * R16.9. Whether this reader is looking at the conversation right now.
     *
     * Marked read here rather than on a call of its own, so a line that
     * arrives while somebody is reading the thread clears itself on the same
     * breath it appears in.
     */
    reading?: boolean;
  } = {},
): Promise<InboxData> {
  const view = opts.view ?? "inbox";
  const key = opts.key ?? null;

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const me = await readerFor(tx, session);
      /* Always, rather than only on their own tab: what was typed and not
         sent belongs in the box the moment that conversation is opened. */
      const drafts = await draftsFor(tx, me);
      const open = key ? await threadAt(tx, me, key) : null;
      if (open && opts.reading) await markThreadRead(tx, me, open.id);
      const said = open ? await messagesIn(tx, me, open.id) : [];
      /* After the read mark, so the count in this answer is what the reader
         is about to be looking at. */
      const listed = view === "sent"
        ? await sentFor(tx, me)
        : await inboxFor(tx, me, { archivedOnly: opts.archived });
      const country = (await getChurch(tx, session.tenantId))?.country ?? null;
      /* The inbox already knows what is waiting; only the other two views
         have to ask. */
      const unread = view === "inbox" && !opts.archived
        ? listed.reduce((sum, one) => sum + (one.unread > 0 ? 1 : 0), 0)
        : await unreadFor(tx, me);
      return { unread, listed, drafts, open, said, country };
    },
  );

  const locale = localeFor(read.country);
  const faces = await heldPhotoUrls([
    ...read.listed.map((one) => one.withPhotoKey),
    ...read.said.map((one) => one.authorPhotoKey),
    ...read.drafts.map((one) => one.photoKey),
    read.open?.withPhotoKey ?? null,
  ]);
  const face = (held: string | null) => (held ? faces[held] ?? null : null);

  return {
    unread: read.unread,
    threads: read.listed.map((one) => ({
      key: one.key,
      name: one.withName,
      photoUrl: face(one.withPhotoKey),
      memberId: one.withMemberId,
      lastLine: one.lastLine,
      lastMine: one.lastMine,
      at: one.lastAt.toISOString(),
      unread: one.unread,
    })),
    drafts: read.drafts.map((one) => ({
      key: one.target,
      name: one.name,
      photoUrl: face(one.photoKey),
      body: one.body,
      at: one.updatedAt.toISOString(),
    })),
    open: read.open
      ? {
          key: read.open.key,
          name: read.open.withName,
          photoUrl: face(read.open.withPhotoKey),
          memberId: read.open.withMemberId,
          archived: read.open.archived,
        }
      : null,
    said: read.said.map((one) => ({
      id: one.id,
      body: one.body,
      fromOffice: one.fromOffice,
      name: one.authorName,
      photoUrl: face(one.authorPhotoKey),
      mine: one.mine,
      clock: one.createdAt.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
      day: one.createdAt.toLocaleDateString(locale, {
        weekday: "long", day: "numeric", month: "long",
      }),
      at: one.createdAt.toISOString(),
    })),
  };
}
