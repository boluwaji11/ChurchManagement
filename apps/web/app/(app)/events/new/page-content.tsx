import { withTenant, getChurch, listForms, canManageEvents } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { RecordPanel } from "@/components/record-panel";
import { ScreenPanel } from "@/components/screen-panel";
import { returnToList } from "@/lib/return-to";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { churchNow } from "@/lib/church-now";
import { EventEditor, EventFormActions } from "../event-editor";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("nav.events"));
}

/** R14.1. A new event, on the page it will be read on. */
export async function NewEventPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const session = await requireSession();
  const closeTo = returnToList(returnTo, "/events");
  if (!canManageEvents(session)) {
    return (
      <ScreenPanel title={t("event.new")} closeTo={closeTo}>
        <Denied role={session.role} action="manageEvents" church={session.tenantSlug} />
      </ScreenPanel>
    );
  }

  const forms = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => ({
      forms: await listForms(tx),
      // The church's own date, so a picker's floor is its today rather than
      // the server's or the reader's.
      today: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
    }),
  );

  return (
    <RecordPanel
      title={t("event.new")}
      formId="event-form"
      closeTo={closeTo}
      width="980px"
      footer={<EventFormActions editing={false} />}
    >
      <EventEditor
        panelled
        church={session.tenantSlug}
        forms={forms.forms.map((one) => ({ id: one.id, name: one.name }))}
        today={forms.today}
      />
    </RecordPanel>
  );
}
