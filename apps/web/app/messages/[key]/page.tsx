import { canEditPeople } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { Denied } from "@/components/denied";
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
 * R16.9. One conversation, open.
 *
 * The address is who it is with. A row id never appears in a link in this
 * product, and "the conversation with Jane Smith" survives whatever the row
 * holding it is called.
 */
export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { key } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canEditPeople(session)) {
    return (
      <AppShell session={session} title={t("inbox.title")}>
        <Denied role={session.role} action="editPerson" church={session.tenantSlug} />
      </AppShell>
    );
  }

  /* R16.9. Read here, so the screen arrives filled. */
  const first = await readInbox(session, { key, reading: true });

  return (
    <AppShell session={session} title={t("inbox.title")} wide>
      <InboxScreen
        church={session.tenantSlug}
        churchName={session.tenantName}
        office
        where="/messages"
        open={key}
        initial={first}
      />
    </AppShell>
  );
}
