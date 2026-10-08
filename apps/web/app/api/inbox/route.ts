import {
  withTenant, inboxFor, sentFor, draftsFor, messagesIn, threadAt, getChurch,
} from "@connectapp/db";
import { localeFor } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { readerFor } from "@/lib/inbox";
import { photoUrls } from "@/lib/photos";

export const dynamic = "force-dynamic";

/**
 * R16.9. What the inbox says right now.
 *
 * The panel asks this every few seconds while it is open, so a reply lands on
 * the other side without anybody reloading the page. Realtime is not in this
 * version and a church of 50 to 500 does not need it: a question every few
 * seconds from whoever is looking at their messages costs one index scan.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await requireSession(url.searchParams.get("church") ?? undefined);
  const view = url.searchParams.get("view") ?? "inbox";
  const key = url.searchParams.get("key");
  const archived = url.searchParams.get("archived") === "1";

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const me = await readerFor(tx, session);
      const threads = await inboxFor(tx, me, { archivedOnly: archived });
      const listed = view === "sent" ? await sentFor(tx, me) : threads;
      const drafts = view === "drafts" ? await draftsFor(tx, me) : [];
      const open = key ? await threadAt(tx, me, key) : null;
      const said = open ? await messagesIn(tx, me, open.id) : [];
      const country = (await getChurch(tx, session.tenantId))?.country ?? null;
      return { me, threads, listed, drafts, open, said, country };
    },
  );

  const locale = localeFor(read.country);
  const faces = await photoUrls([
    ...read.listed.map((one) => one.withPhotoKey),
    ...read.said.map((one) => one.authorPhotoKey),
    read.open?.withPhotoKey ?? null,
  ]);
  const face = (key: string | null) => (key ? faces[key] ?? null : null);

  const clock = (at: Date) =>
    at.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const day = (at: Date) =>
    at.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  return Response.json({
    /* How many conversations are waiting, which is what the mark carries. */
    unread: read.threads.reduce((sum, one) => sum + (one.unread > 0 ? 1 : 0), 0),
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
      clock: clock(one.createdAt),
      day: day(one.createdAt),
      at: one.createdAt.toISOString(),
    })),
  });
}
