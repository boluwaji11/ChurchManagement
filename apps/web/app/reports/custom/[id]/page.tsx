import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  withTenant, getSavedReport, runReport, canEditPeople, canReadIncidents,
  GRID_COLUMNS, type ReportTile, type ReportResult,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { Answer } from "../../answer";
import { DownloadMenu } from "./download";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("reports.title"), church);
}

/** What a visual is called when nobody has named it. */
const nameOf = (tile: ReportTile): string =>
  tile.title
  || (tile.groupBy
    ? t("report.by", { field: t(`report.field.${tile.groupBy}` as never) })
    : t(`report.subject.${tile.subject}` as never));

/**
 * R18.12. A report the church built, run.
 *
 * The same compiler the builder previewed with, laid out on the same grid, so
 * what was arranged is what is read. The spec is checked against the catalogue
 * on the way out of the database as well as on the way in.
 */
export default async function CustomReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <AppShell session={session} title={t("reports.title")}>
        <Denied role={session.role} action="buildReports" church={session.tenantSlug} />
      </AppShell>
    );
  }

  const found = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const saved = await getSavedReport(tx, id);
      if (!saved) return null;

      const answers: Record<string, ReportResult> = {};
      for (const tile of saved.spec.tiles) {
        answers[tile.id] = await runReport(tx, tile);
      }
      return { saved, answers };
    },
  );

  if (!found) notFound();
  const { saved, answers } = found;

  return (
    <AppShell session={session} title={t("reports.title")} wide>
      <Link
        href={`/reports?church=${session.tenantSlug}`}
        className="-mb-5 -mt-3 inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t("reports.title")}
      </Link>

      <div className="-mb-3 flex flex-wrap items-center gap-3">
        <h2 className="flex-1 font-display text-[22px] leading-[28px] text-fg">{saved.name}</h2>

        <Link
          href={`/reports/build?church=${session.tenantSlug}&id=${saved.slug}`}
          aria-label={t("report.edit")}
          title={t("report.edit")}
          className="inline-flex size-[var(--d-tap)] shrink-0 items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted transition-colors hover:bg-sunken hover:text-fg [&_svg]:size-[var(--d-icon)]"
        >
          <Pencil />
        </Link>

        <DownloadMenu slug={saved.slug} church={session.tenantSlug} />
      </div>

      {/* Laid out on the grid it was arranged on. */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
          gridAutoRows: "72px",
        }}
      >
        {saved.spec.tiles.map((tile) => {
          const result = answers[tile.id];
          return (
            <section
              key={tile.id}
              style={{
                gridColumn: `${tile.place.x + 1} / span ${tile.place.w}`,
                gridRow: `${tile.place.y + 1} / span ${tile.place.h}`,
              }}
              className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface p-4"
            >
              <h3 className="mb-2 truncate font-display text-[17px] leading-6 text-fg">
                {nameOf(tile)}
              </h3>

              {/* The visual takes the box it was sized to, so reading a report
                  is reading it rather than scrolling inside each tile. */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {!result || result.rows.length === 0 ? (
                  <p className="text-[13px] text-fg-muted">{t("report.nothingMatches")}</p>
                ) : (
                  <Answer spec={tile} result={result} fill />
                )}
              </div>

              {result && result.total !== null ? (
                <p className="mt-2 shrink-0 border-t border-line pt-2 text-[13px] text-fg">
                  {t("report.totalIs", { total: result.total.toLocaleString() })}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
