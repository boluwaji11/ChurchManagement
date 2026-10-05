import { notFound, redirect } from "next/navigation";
import { withTenant, getEvent, getForm, listForms, canManageEvents } from "@hearth/db";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { EventView } from "./view";

export const dynamic = "force-dynamic";

/**
 * R14.1. One event.
 *
 * The page the designer was writing: the cover, the name, when and where, and
 * under it what the event is with its registrations beside it. The same shape a
 * group's page has, because a church reading one should not have to learn a
 * second layout.
 */
export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { church, tab } = await searchParams;
  const session = await requireSession(church);
  if (!canManageEvents(session)) redirect(`/?church=${session.tenantSlug}`);

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const result = await withTenant(ctx, async (tx) => {
    const found = await getEvent(tx, id);
    if (!found) return null;
    return {
      event: found,
      form: found.formId ? await getForm(tx, found.formId) : null,
      forms: await listForms(tx),
    };
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

  return (
    <AppShell session={session}>
      <EventView
        church={session.tenantSlug}
        event={result.event}
        coverUrl={coverUrl}
        questions={result.form?.fields.filter((one) => one.kind !== "section").length ?? 0}
        formId={result.event.formId}
        forms={result.forms.map((one) => ({ id: one.id, name: one.name }))}
        tab={tab === "registrations" || tab === "questions" ? tab : "overview"}
      />
    </AppShell>
  );
}
