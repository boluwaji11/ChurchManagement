import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, liveFor, canManageServices } from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { longDate, readableTime } from "@/lib/dates";
import { Stage } from "./stage";

export const dynamic = "force-dynamic";

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
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => liveFor(tx, id),
  );
  if (!live) notFound();

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href={`/services/${id}?church=${session.tenantSlug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {live.serviceName}
        </Link>

        <PageTitle
          title={t("live.title")}
          lede={`${longDate(live.occursOn)} ${readableTime(live.startsAt)}`}
          className="mb-8"
        />

        <Stage
          church={session.tenantSlug}
          occurrenceId={id}
          initial={live}
          canRun={canManageServices(session.role)}
        />
      </main>
    </>
  );
}
