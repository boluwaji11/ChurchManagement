import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getSavedReport, canEditPeople, canReadIncidents,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Builder } from "./builder";

export const dynamic = "force-dynamic";

/**
 * R18.x. The screen a church builds its own report on.
 *
 * Reports are already behind a staff role, so anybody who can read one can
 * build one. What they can build is bounded by the catalogue rather than by
 * who they are.
 */
export default async function BuildReportPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; id?: string }>;
}) {
  const { church, id } = await searchParams;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const saved = id
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        (tx) => getSavedReport(tx, id),
      )
    : null;

  if (id && !saved) notFound();

  return (
    /* The bar says which report this is, so the page does not say it again
       underneath. */
    <AppShell session={session} title={saved?.name ?? t("report.build")} wide>
      <Link
        href={`/reports?church=${session.tenantSlug}`}
        className="-mb-3 inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t("reports.title")}
      </Link>

      <Builder
        church={session.tenantSlug}
        saved={saved ? { id: saved.id, slug: saved.slug, name: saved.name, spec: saved.spec } : null}
      />
    </AppShell>
  );
}
