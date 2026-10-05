import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, getEvent, canManageEvents } from "@hearth/db";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
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
    (tx) => getEvent(tx, id),
  );
  if (!found) notFound();

  let coverUrl: string | null = null;
  if (found.coverKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(found.coverKey, 3600);
    coverUrl = signed.data?.signedUrl ?? null;
  }

  return (
    <AppShell session={session}>
      <Link
        href={`/events/${found.id}?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {found.name}
      </Link>

      <EventEditor church={session.tenantSlug} event={found} coverUrl={coverUrl} />
    </AppShell>
  );
}
