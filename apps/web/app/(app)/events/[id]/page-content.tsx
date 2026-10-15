import { notFound } from "next/navigation";
import {
  withTenant, getEvent, getForm, listRegistrations, canManageEvents,
} from "@connectapp/db";
import { RecordPanel, type RecordPanelSection } from "@/components/record-panel";
import { ScreenPanel } from "@/components/screen-panel";
import { returnToList } from "@/lib/return-to";
import { requireSession } from "@/lib/session";
import { publicLink } from "@/lib/church-address";
import { Denied } from "@/components/denied";
import { supabaseServer } from "@/lib/supabase/server";
import { EventView, EventActions } from "./view";
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

/**
 * R14.1. One event.
 *
 * The page the designer was writing: the cover, the name, when and where, and
 * under it what the event is with its registrations beside it. The same shape a
 * group's page has, because a church reading one should not have to learn a
 * second layout.
 */
export async function EventPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const session = await requireSession();
  const closeTo = returnToList(returnTo, "/events");
  if (!canManageEvents(session)) {
    return (
      <ScreenPanel title={t("event.title")} closeTo={closeTo}>
        <Denied role={session.role} action="manageEvents" church={session.tenantSlug} />
      </ScreenPanel>
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const result = await withTenant(ctx, async (tx) => {
    const found = await getEvent(tx, id);
    if (!found) return null;

    // R14.12. The roster, and the questions that name its columns. R24.11.
    // Neither waits on the other.
    const [registrations, form] = await Promise.all([
      found.takesRegistrations ? listRegistrations(tx, found.id) : [],
      found.formId ? getForm(tx, found.formId) : null,
    ]);

    return { event: found, registrations, questions: form?.fields ?? [] };
  });
  if (!result) notFound();

  let coverUrl: string | null = null;
  if (result.event.coverKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage
      .from("church")
      .createSignedUrl(result.event.coverKey, 3600);
    coverUrl = signed.data?.signedUrl ?? null;
  }

  /* R14.1, R24.6. The rail names the parts. An announcement takes no
     registrations, so it has one part and no rail. */
  const sections: RecordPanelSection[] = result.event.takesRegistrations
    ? [
        { id: "overview", label: t("event.tab.overview") },
        { id: "registrations", label: t("event.tab.registrations") },
      ]
    : [];

  return (
    <RecordPanel
      title={result.event.name}
      sections={sections.length > 1 ? sections : undefined}
      actions={<EventActions only="marks" event={result.event} />}
      /* R24.6. Archiving sits at the far left of the window's footer, away
         from the marks that are pressed every day. */
      footer={
        <div className="flex w-full items-center">
          <EventActions only="archive" event={result.event} />
        </div>
      }
      closeTo={closeTo}
      width="980px"
    >
      <EventView
        /* R14.2, R17.1. Built here rather than from the window, so what a
           church copies is the address the public route answers on. */
        publicLink={await publicLink(session.tenantSlug, "e", `/${result.event.slug}`)}
        event={result.event}
        coverUrl={coverUrl}
        registrations={result.registrations}
        questions={result.questions.map((one) => ({ id: one.id, label: one.label, kind: one.kind }))}
      />
    </RecordPanel>
  );
}
