import { notFound } from "next/navigation";
import { withTenant, getEvent, listForms, canManageEvents } from "@connectapp/db";
import { RecordPanel } from "@/components/record-panel";
import { returnToUnder } from "@/lib/return-to";
import { requireSession } from "@/lib/session";
import { shellData } from "@/lib/shell-data";
import { Denied } from "@/components/denied";
import { churchNow } from "@/lib/church-now";
import { supabaseServer } from "@/lib/supabase/server";
import { EventEditor, EventFormActions } from "../../event-editor";
import { tabMetadata } from "@/lib/page-metadata";
import { t } from "@connectapp/i18n";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("event.title"));
}

/** R14.1. Changing an event, on the same page it was written on. */
export async function EditEventPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const session = await requireSession();
  if (!canManageEvents(session)) {
    return (
      <Denied role={session.role} action="manageEvents" church={session.tenantSlug} />
      
    );
  }

  const today = churchNow((await shellData(session)).church?.timezone ?? "America/Chicago").date;

  const found = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    /* R24.11. Two reads that want nothing from each other, together. The
       clock comes from the frame, which has already read the church. */
    async (tx) => {
      const [event, forms] = await Promise.all([getEvent(tx, id), listForms(tx)]);
      return { event, forms, today };
    },
  );
  if (!found.event) notFound();
  const event = found.event;

  let coverUrl: string | null = null;
  if (event.coverKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(event.coverKey, 3600);
    coverUrl = signed.data?.signedUrl ?? null;
  }

  return (
    <RecordPanel
      title={t("event.editTitle", { name: event.name })}
      formId="event-form"
      closeTo={returnToUnder(returnTo, "/events", `/events/${event.slug}`)}
      width="980px"
      footer={<EventFormActions editing />}
    >
      <EventEditor
        panelled
        church={session.tenantSlug}
        event={event}
        coverUrl={coverUrl}
        forms={found.forms.map((one) => ({ id: one.id, name: one.name }))}
        today={found.today}
      />
    </RecordPanel>
  );
}
