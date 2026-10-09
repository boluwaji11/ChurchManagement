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

/** R16.9, R17.1. One of a member's conversations, open at its own address. */
export default async function MemberThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string[] }>;
  searchParams: Promise<{ church?: string }>;
}) {
  /* R16.9. The address is who it is with: a person's own, or a group's,
     which carries a kind in front of it. */
  const { key: parts } = await params;
  const key = parts.join("/");
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/messages/${key}?church=${session.tenantSlug}`);
  }

  const first = await readInbox(session, { key, reading: true });

  return (
    <PortalShell session={session} tab={t("inbox.title")}>
      <PortalTitle title={t("inbox.title")} />
      <InboxScreen
        church={session.tenantSlug}
        churchName={session.tenantName}
        office={false}
        where="/home/messages"
        open={key}
        initial={first}
      />
    </PortalShell>
  );
}
