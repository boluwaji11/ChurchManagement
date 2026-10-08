import {
  withTenant, threadsForStaff, messagesIn, markThreadRead, getChurch,
  canEditPeople,
} from "@connectapp/db";
import { t, localeFor } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { Denied } from "@/components/denied";
import { requireSession } from "@/lib/session";
import { photoUrls } from "@/lib/photos";
import { tabMetadata } from "@/lib/page-metadata";
import { Inbox, type Said, type ThreadRow } from "./inbox";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("inbox.title"), church);
}

/**
 * R16.9. The office's inbox.
 *
 * Every thread the church has with a member, and the one being answered beside
 * it. Nothing here is sent anywhere: it is written in the product and read in
 * the product, which is why a church pays nothing to run it.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; id?: string; archived?: string }>;
}) {
  const { church, id, archived } = await searchParams;
  const session = await requireSession(church);
  const putAway = archived === "1";

  if (!canEditPeople(session)) {
    return (
      <AppShell session={session} title={t("inbox.title")}>
        <Denied role={session.role} action="editPerson" church={session.tenantSlug} />
      </AppShell>
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => {
    const threads = await threadsForStaff(tx, putAway ? { archivedOnly: true } : {});
    const away = putAway ? threads : await threadsForStaff(tx, { archivedOnly: true });
    const open = id ? threads.find((one) => one.id === id) ?? null : null;

    /* Opening it is reading it. */
    if (open) await markThreadRead(tx, open.id, "church");

    return {
      threads,
      archivedCount: putAway ? 0 : away.length,
      open,
      said: open ? await messagesIn(tx, open.id) : [],
      country: (await getChurch(tx, session.tenantId))?.country ?? null,
    };
  });

  const faces = await photoUrls(read.threads.map((one) => one.photoKey));
  const locale = localeFor(read.country);

  const shape = (one: (typeof read.threads)[number]): ThreadRow => ({
    id: one.id,
    memberId: one.memberId,
    name: one.name,
    photoUrl: one.photoKey ? faces[one.photoKey] ?? null : null,
    lastLine: one.lastLine,
    when: one.lastMessageAt.toLocaleDateString(locale, { day: "numeric", month: "short" }),
    unread: one.unread,
  });

  const said: Said[] = read.said.map((one) => ({
    id: one.id,
    side: one.side,
    body: one.body,
    when: one.createdAt.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    day: one.createdAt.toLocaleDateString(locale, {
      weekday: "long", day: "numeric", month: "long",
    }),
  }));

  return (
    <AppShell
      session={session}
      title={putAway ? t("inbox.archived.title") : t("inbox.title")}
      wide
    >
      <Inbox
        church={session.tenantSlug}
        threads={read.threads.map(shape)}
        open={read.open ? shape(read.open) : null}
        said={said}
        putAway={putAway}
        archivedCount={read.archivedCount}
      />
    </AppShell>
  );
}
