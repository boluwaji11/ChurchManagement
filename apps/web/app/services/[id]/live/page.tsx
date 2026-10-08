import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, liveFor, canManageServices } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PageMeta } from "@/components/section";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { longDate, readableTime } from "@/lib/dates";
import { Stage } from "./stage";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("live.title"), church);
}

/**
 * R11.11. Live mode.
 *
 * Open to anybody signed in, because the team is the audience: a musician wants
 * to know what is happening without being able to change it. The controls are
 * for whoever runs services.
 */
export default async function LivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  const live = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => liveFor(tx, id),
  );
  if (!live) notFound();

  return (
    <AppShell
      session={session}
      title={t("live.title")}
    >
      <Link
        href={`/services/${live.slug}?church=${session.tenantSlug}`}
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 self-start py-2 text-label text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> {live.serviceName}
      </Link>

      <PageMeta>{`${longDate(live.occursOn)} ${readableTime(live.startsAt)}`}</PageMeta>

      <Stage
        church={session.tenantSlug}
        /* The record's own id. Every control on this screen writes through an
           action that takes one, and what was in the address may be the
           readable address instead. */
        occurrenceId={live.occurrenceId}
        initial={live}
        canRun={canManageServices(session)}
      />
    </AppShell>
  );
}
