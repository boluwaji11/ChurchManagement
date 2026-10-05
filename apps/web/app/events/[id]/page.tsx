import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { withTenant, getEvent, getForm, canManageEvents } from "@hearth/db";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
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
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/events?church=${session.tenantSlug}`}
          className="inline-flex flex-1 items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("event.title")}
        </Link>

        <Button
          variant="ghost"
          asChild
          className="size-[var(--d-tap)] min-h-0 rounded-[var(--d-radius-control)] px-0 [&_svg]:size-[var(--d-icon)]"
        >
          <Link
            href={`/events/${result.event.id}/edit?church=${session.tenantSlug}`}
            aria-label={t("action.edit")}
            title={t("action.edit")}
          >
            <Pencil />
          </Link>
        </Button>
      </div>

      <EventView
        church={session.tenantSlug}
        event={result.event}
        coverUrl={coverUrl}
        questions={result.form?.fields.filter((one) => one.kind !== "section").length ?? 0}
        formId={result.event.formId}
        tab={tab === "registrations" || tab === "questions" ? tab : "overview"}
      />
    </AppShell>
  );
}
