import { notFound } from "next/navigation";
import { canEditPeople, canReadIncidents, withTenant, getChurch } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchLogoUrl } from "@/lib/church-logo";
import { BrandRuleFor } from "@/components/brand-rule";
import { AutoPrint } from "@/app/checkin/rooms/print/auto-print";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";
import { windowOf } from "../frame";
import { sheetFor, isBuiltIn, type SheetTable } from "../sheets";

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

/**
 * R18.10. A built-in report on paper, which is also its PDF.
 *
 * One page for all three, because a report on paper is the same shape every
 * time: whose church it is, what it reads, the numbers across the top and the
 * tables under them. Printed on the way in, so the figures are the figures at
 * the moment somebody asked for them.
 *
 * The series the screen draws as a line is printed as its own table. A line on
 * paper that a board member cannot read a value off is decoration.
 */
export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; report?: string; days?: string }>;
}) {
  const { church, report, days } = await searchParams;
  const session = await requireSession(church);

  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <main id="main" className="mx-auto min-h-dvh max-w-lg px-4 py-8">
        <Denied role={session.role} action="readReports" church={session.tenantSlug} />
      </main>
    );
  }

  if (!isBuiltIn(report)) notFound();

  const window = windowOf(days);
  const sheet = await sheetFor(report, session, window);
  const hue = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => (await getChurch(tx, session.tenantId))?.brandHue ?? "indigo",
  );
  const logo = await churchLogoUrl(session.tenantId, session.role);

  const Table = ({ one }: { one: SheetTable }) => (
    <section className="mb-7 break-inside-avoid">
      <h2 className="mb-2 font-display text-[17px] leading-6">{one.title}</h2>
      {one.rows.length === 0 ? (
        <p className="text-[13px]">{t("reports.none")}</p>
      ) : (
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              {one.columns.map((column, at) => (
                <th
                  key={column}
                  className={`border-b border-black px-2 py-1.5 font-semibold ${
                    one.numeric[at] ? "text-right" : "text-left"
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {one.rows.map((row, at) => (
              <tr key={at} className="break-inside-avoid">
                {row.map((cell, column) => (
                  <td
                    key={column}
                    className={`border-b border-black/15 px-2 py-1 ${
                      one.numeric[column] ? "text-right tabular-nums" : "text-left"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );

  return (
    <main className="mx-auto max-w-4xl bg-white px-8 py-8 text-black print:max-w-none print:px-10">
      <AutoPrint />

      {/* The browser's own header and footer come off, and the padding above
          puts the white space back where it belongs. */}
      <style>{"@page { margin: 0; }"}</style>

      <BrandRuleFor hue={hue} className="mb-5 h-1.5 w-full print:h-[3mm]" />

      <header className="mb-6 flex items-start justify-between gap-4 border-b border-black pb-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* The church's own mark, so a sheet handed round says whose it is. */}
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-10 w-auto max-w-[120px] object-contain" />
          ) : null}
          <div className="flex min-w-0 flex-col">
            <h1 className="min-w-0 truncate font-display text-display">{sheet.title}</h1>
            <span className="text-[12px]">{sheet.window}</span>
          </div>
        </div>
        <span className="shrink-0 text-right text-[length:var(--d-text-body)]">
          {session.tenantName}
          <br />
          {sheet.asked}
        </span>
      </header>

      <div className="mb-7 grid grid-cols-4 gap-3 break-inside-avoid">
        {sheet.figures.map((one) => (
          <div key={one.label} className="border border-black/25 p-2.5">
            <p className="text-[11px] uppercase tracking-[0.04em]">{one.label}</p>
            <p className="font-display text-[26px] leading-8 tabular-nums">{one.value}</p>
            {one.sub ? <p className="text-[11px]">{one.sub}</p> : null}
          </div>
        ))}
      </div>

      {sheet.blocks.map((block) =>
        block.kind === "table" ? (
          <Table key={block.title} one={block} />
        ) : (
          <Table
            key={block.title}
            one={{
              kind: "table",
              title: block.title,
              columns: [t("reports.date"), block.name],
              numeric: [false, true],
              rows: block.points.map((one) => [one.label, String(one.value)]),
            }}
          />
        ))}
    </main>
  );
}
