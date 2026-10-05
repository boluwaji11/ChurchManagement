import { notFound } from "next/navigation";
import {
  withTenant, getSavedReport, runReport, canEditPeople, canReadIncidents,
  GRID_COLUMNS, type ReportTile, type ReportResult,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { churchLogoUrl } from "@/lib/church-logo";
import { getChurch } from "@hearth/db";
import { BrandRuleFor } from "@/components/brand-rule";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";
import { Answer } from "../../../answer";

export const dynamic = "force-dynamic";

/** What a visual is called when nobody has named it. */
const nameOf = (tile: ReportTile): string =>
  tile.title
  || (tile.groupBy
    ? t("report.by", { field: t(`report.field.${tile.groupBy}` as never) })
    : t(`report.subject.${tile.subject}` as never));

/**
 * R18.10, R18.12. A built report on paper, which is also the PDF.
 *
 * The same compiler and the same visuals as the screen, laid out on the grid
 * they were arranged on, on white. Generated when it is printed, so the numbers
 * are the numbers at the moment somebody asked for them.
 */
export default async function PrintReportPage({
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
      <main id="main" className="mx-auto min-h-dvh max-w-lg px-4 py-8">
        <Banner tone="info" title={t("reports.title")}>{t("forbidden.askAdmin")}</Banner>
      </main>
    );
  }

  const found = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const saved = await getSavedReport(tx, id);
      if (!saved) return null;

      const profile = await getChurch(tx, session.tenantId);
      const answers: Record<string, ReportResult> = {};
      for (const tile of saved.spec.tiles) {
        answers[tile.id] = await runReport(tx, tile);
      }
      return {
        saved,
        answers,
        when: churchNow(profile?.timezone ?? "America/Chicago"),
        hue: profile?.brandHue ?? "indigo",
      };
    },
  );

  if (!found) notFound();
  const { saved, answers, when, hue } = found;
  const logo = await churchLogoUrl(session.tenantId, session.role);

  return (
    <main className="mx-auto max-w-5xl bg-white px-8 py-8 text-black print:max-w-none print:px-10">
      <AutoPrint />

      {/* The browser's own header and footer come off, and the padding above
          puts the white space back where it belongs. */}
      <style>{"@page { size: landscape; margin: 0; }"}</style>

      <BrandRuleFor hue={hue} className="mb-5 h-1.5 w-full print:h-[3mm]" />

      <header className="mb-6 flex items-center justify-between gap-4 border-b border-black pb-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* The church's own mark, so a sheet handed round says whose it is. */}
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-10 w-auto max-w-[120px] object-contain" />
          ) : null}
          <h1 className="min-w-0 truncate font-display text-display">{saved.name}</h1>
        </div>
        <span className="shrink-0 text-right text-[length:var(--d-text-body)]">
          {session.tenantName}
          <br />
          {when.date}
        </span>
      </header>

      <div
        className="grid gap-4"
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
              className="flex min-w-0 break-inside-avoid flex-col overflow-hidden border border-black/25 p-3"
            >
              <h2 className="mb-2 truncate font-display text-[17px] leading-6">{nameOf(tile)}</h2>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {!result || result.rows.length === 0 ? (
                  <p className="text-[13px]">{t("report.nothingMatches")}</p>
                ) : (
                  <Answer spec={tile} result={result} fill />
                )}
              </div>

              {result && result.total !== null ? (
                <p className="mt-2 shrink-0 border-t border-black/25 pt-2 text-[13px]">
                  {t("report.totalIs", { total: result.total.toLocaleString() })}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </main>
  );
}
