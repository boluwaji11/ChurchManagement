import { redirect } from "next/navigation";
import { canEditPeople, canReadIncidents } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalShell, PortalTitle } from "@/components/portal-shell";
import { requireSession } from "@/lib/session";
import { tabMetadata } from "@/lib/page-metadata";
import { InboxScreen } from "@/components/inbox/screen";
import { readInbox } from "@/lib/inbox-read";

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
 * R16.9, R17.1. A member's messages.
 *
 * The church office, and whoever leads something they are part of. Nothing
 * here is sent anywhere.
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

  const first = await readInbox(session, { key: null });

  return (
    <PortalShell session={session} tab={t("inbox.title")}>
      <PortalTitle title={t("inbox.title")} />
      <InboxScreen
        church={session.tenantSlug}
        churchName={session.tenantName}
        office={false}
        here="/home/messages"
        open={null}
        initial={first}
      />
    </PortalShell>
  );
}
