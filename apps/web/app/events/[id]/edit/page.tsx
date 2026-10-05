import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, getChurch, getEvent, listForms, canManageEvents } from "@hearth/db";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { supabaseServer } from "@/lib/supabase/server";
import { EventEditor } from "../../event-editor";

export const dynamic = "force-dynamic";

/** R14.1. Changing an event, on the same page it was written on. */
export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageEvents(session)) redirect(`/?church=${session.tenantSlug}`);

  const found = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => ({
      event: await getEvent(tx, id),
      forms: await listForms(tx),
      today: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
    }),
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
    <AppShell session={session}>
      <Link
        href={`/events/${event.id}?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {event.name}
      </Link>

      <EventEditor
        church={session.tenantSlug}
        event={event}
        coverUrl={coverUrl}
        forms={found.forms.map((one) => ({ id: one.id, name: one.name }))}
        today={found.today}
      />
    </AppShell>
  );
}
