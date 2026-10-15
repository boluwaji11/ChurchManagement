import { redirect } from "next/navigation";
import { canAnswerMessages } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalTitle } from "@/components/portal-shell";
import { Screen } from "@/components/screen";
import { requireScreen } from "@/lib/shell-data";
import { tabMetadata } from "@/lib/page-metadata";
import { InboxScreen } from "@/components/inbox/screen";
import { readInbox } from "@/lib/inbox-read";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("inbox.title"));
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
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  const session = await requireScreen();

  // Staff have their own inbox, which is the other side of these threads.
  if (canAnswerMessages(session)) {
    redirect("/messages");
  }

  const first = await readInbox(session, { key: null });

  return (
    <Screen>
      <PortalTitle title={t("inbox.title")} />
      <InboxScreen
        church={session.tenantSlug}
        churchName={session.tenantName}
        office={false}
        where="/home/messages"
        open={null}
        initial={first}
      />
    </Screen>
  );
}
