import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import {
  withTenant, getSavedReport, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { Screen } from "@/components/screen";
import { requireScreen } from "@/lib/shell-data";
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
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("report.build"));
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
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await requireScreen();
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
      <Screen title={t("reports.title")}>
        <Empty
          icon="noResults"
          title={t("report.notYours")}
          action={
            <Button asChild variant="secondary">
              <Link href={`/reports/custom/${saved.slug}`}>
                {t("report.open")}
              </Link>
            </Button>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen wide>
      <Link
        href={"/reports"}
        className="-mb-5 -mt-3 inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t("reports.title")}
      </Link>

      <h2 className="font-display text-[22px] font-normal leading-[28px] text-fg">
        {saved?.name ?? t("report.build")}
      </h2>
      <Builder
        church={session.tenantSlug}
        saved={saved ? { id: saved.id, slug: saved.slug, name: saved.name, spec: saved.spec } : null}
      />
    </Screen>
  );
}
