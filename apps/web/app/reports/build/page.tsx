import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getSavedReport, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { Builder } from "./builder";
import { Empty } from "@/components/empty";
import { Button } from "@connectapp/ui";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("report.build"), church);
}

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
    return (
      <Denied role={session.role} action="buildReports" church={session.tenantSlug} />
      
    );
  }

  /* R18.x. A report is the reader's own unless the church shares it. */
  const who = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const saved = id
    ? await withTenant(
        who,
        (tx) => getSavedReport(tx, who, id),
      )
    : null;

  if (id && !saved) notFound();
  /* R18.x. A shared report is read by the church and changed by whoever
     wrote it. This is not about the reader's role, so it does not borrow the
     screen that talks about roles. */
  if (saved && saved.createdByUserId !== session.userId) {
    return (
      <AppShell session={session} title={t("reports.title")}>
        <Empty
          icon="noResults"
          title={t("report.notYours")}
          action={
            <Button asChild variant="secondary">
              <Link href={`/reports/custom/${saved.slug}?church=${session.tenantSlug}`}>
                {t("report.open")}
              </Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    /* The bar says which report this is, so the page does not say it again
       underneath. */
    <AppShell session={session} title={saved?.name ?? t("report.build")} wide>
      <Link
        href={`/reports?church=${session.tenantSlug}`}
        className="-mb-5 -mt-3 inline-flex items-center gap-1.5 self-start font-medium text-primary"
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
