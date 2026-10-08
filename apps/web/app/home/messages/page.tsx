import { redirect } from "next/navigation";
import {
  withTenant, memberForUser, openThread, messagesIn, markThreadRead,
  getChurch, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { t, localeFor } from "@connectapp/i18n";
import { PortalShell, PortalTitle } from "@/components/portal-shell";
import { requireSession } from "@/lib/session";
import { tabMetadata } from "@/lib/page-metadata";
import { Thread, type Said } from "./thread";

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
 * R16.9, R17.1. A member's conversation with their church.
 *
 * One thread, for the life of their membership. A member who wrote in August
 * and writes again in March writes into the same place, and the church reads
 * both without going looking.
 */
export default async function MemberMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // Staff have their own inbox, which is the other side of these threads.
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/messages?church=${session.tenantSlug}`);
  }

  const read = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const me = await memberForUser(tx, session.userId);
      if (!me) return { said: [], country: null as string | null };

      const thread = await openThread(tx, session.tenantId, me);
      const said = await messagesIn(tx, thread);
      /* Opening it is reading it. */
      await markThreadRead(tx, thread, "member");

      const profile = await getChurch(tx, session.tenantId);
      return { said, country: profile?.country ?? null };
    },
  );

  const locale = localeFor(read.country);
  const lines: Said[] = read.said.map((one) => ({
    id: one.id,
    side: one.side,
    body: one.body,
    when: one.createdAt.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    day: one.createdAt.toLocaleDateString(locale, {
      weekday: "long", day: "numeric", month: "long",
    }),
  }));

  return (
    <PortalShell session={session} tab={t("inbox.title")}>
      <PortalTitle title={t("inbox.title")} />

      {lines.length === 0 ? (
        <p className="text-fg-muted">{t("inbox.noneYet")}</p>
      ) : null}

      <Thread church={session.tenantSlug} churchName={session.tenantName} said={lines} />
    </PortalShell>
  );
}
