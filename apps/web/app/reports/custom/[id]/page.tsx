import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import {
  withTenant, getSavedReport, runReport, canEditPeople, canReadIncidents, SUBJECTS,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { PagedTable, type Row } from "../../paged-table";
import { Answer, read } from "../../build/builder";

export const dynamic = "force-dynamic";

/**
 * R18.x. A report the church built, run.
 *
 * The same compiler the preview used, so what was built is what is read, and
 * the spec is checked against the catalogue on the way out of the database as
 * well as on the way in.
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
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const found = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const saved = await getSavedReport(tx, id);
      if (!saved) return null;
      return { saved, result: await runReport(tx, saved.spec) };
    },
  );

  if (!found) notFound();
  const { saved, result } = found;
  const rows: Row[] = result.rows.map((row, i) => ({
    key: String(i),
    cells: result.columns.map((column, c) => ({
      text: read(row[c] ?? ""),
      numeric: column.kind === "number",
      muted: c > 0,
    })),
  }));

  return (
    <AppShell session={session} title={t("reports.title")} wide>
      <Link
        href={`/reports?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t("reports.title")}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 font-display text-[22px] leading-[28px] text-fg">{saved.name}</h2>

        <Link
          href={`/reports/build?church=${session.tenantSlug}&id=${saved.id}`}
          aria-label={t("report.edit")}
          title={t("report.edit")}
          className="inline-flex size-[var(--d-tap)] shrink-0 items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted transition-colors hover:bg-sunken hover:text-fg [&_svg]:size-[var(--d-icon)]"
        >
          <Pencil />
        </Link>

        <a
          href={`/reports/custom/${saved.id}/export?church=${session.tenantSlug}`}
          aria-label={t("reports.export")}
          title={t("reports.export")}
          className="inline-flex size-[var(--d-tap)] shrink-0 items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted transition-colors hover:bg-sunken hover:text-fg [&_svg]:size-[var(--d-icon)]"
        >
          <Download />
        </a>
      </div>

      {result.rows.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("report.nothingMatches")}
        </p>
      ) : (
        <>
          {/* Drawn by the same renderer the builder previewed it with, so
              what was built is what is read. */}
          {saved.spec.view !== "table" ? (
            <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
              <h3 className="font-display text-[22px] leading-7 text-fg">{t("report.answer")}</h3>
              <Answer spec={saved.spec} result={result} />
            </section>
          ) : null}

          <PagedTable
            title={t(SUBJECTS[saved.spec.subject].label as never)}
            columns={result.columns.map((one) => t(one.label as never))}
            rows={rows}
          />

          {result.more ? (
            <p className="text-caption text-fg-muted">
              {t("report.firstRows", { count: String(result.rows.length) })}
            </p>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
