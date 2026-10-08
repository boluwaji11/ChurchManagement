import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
  attendanceByService, attendanceByName, attendanceSummary, attendanceByWeekday,
} from "@connectapp/db";
import { hueForId } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { ReportFrame, backBy, windowOf } from "../frame";
import { Figure } from "../figure";
import { Donut, Line, RowBars, type Slice } from "../charts";
import { PagedTable, type Row } from "../paged-table";
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

/**
 * R18.2. How many came, service by service.
 *
 * Read in the order the question is asked: what the window came to and whether
 * that is up or down, the shape over time, where the members actually are
 * between one service and another, which day of the week is carrying the
 * church, and then the two lists.
 */
export default async function AttendanceReport({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; days?: string }>;
}) {
  const { church, days } = await searchParams;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <Denied role={session.role} action="readReports" church={session.tenantSlug} />
      
    );
  }

  const window = windowOf(days);

  const { services, byName, summary, weekdays } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      const range = { from: backBy(clock.date, window), to: clock.date };
      return {
        services: await attendanceByService(tx, range),
        byName: await attendanceByName(tx, range),
        summary: await attendanceSummary(tx, range),
        weekdays: await attendanceByWeekday(tx, range),
      };
    },
  );

  // One hue per service name, settled once so the chart, the legend, the ring
  // and both lists all key the same service the same colour.
  const hues = new Map(byName.map((one) => [one.name, hueForId(one.name) as string]));
  const hueOf = (name: string) => hues.get(name) ?? "indigo";

  const change = summary.average - summary.before;

  const dayName = (weekday: number) =>
    new Date(Date.UTC(2024, 0, 7 + weekday)).toLocaleDateString(undefined, { weekday: "long" });

  const slices: Slice[] = byName
    .filter((one) => one.total > 0)
    .map((one) => ({ key: one.name, label: one.name, value: one.total, hue: hueOf(one.name) }));

  const everyService: Row[] = [...services].reverse().map((one) => ({
    key: one.occurrenceId,
    cells: [
      { text: one.name, hue: hueOf(one.name) },
      { text: shortDate(one.occursOn), muted: true },
      { text: String(one.present), numeric: true },
    ],
  }));

  const eachService: Row[] = byName.map((one) => ({
    key: one.name,
    cells: [
      { text: one.name, hue: hueOf(one.name) },
      { text: String(one.held), numeric: true, muted: true },
      { text: String(one.average), numeric: true },
      { text: String(one.best), numeric: true, muted: true },
      { text: String(one.total), numeric: true, muted: true },
    ],
  }));

  return (
    <AppShell session={session} title={t("reports.title")} wide>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.attendance.title")}
        window={window}
        path="attendance"
      >
        {summary.held === 0 ? (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("reports.none")}</p>
        ) : (
          <>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <Figure
                label={t("reports.attendance.average")}
                value={String(summary.average)}
                hue="violet"
                sub={
                  summary.before === 0
                    ? t("reports.attendance.noBefore")
                    : t("reports.attendance.vsBefore", {
                        delta: `${change > 0 ? "+" : ""}${change}`,
                      })
                }
              />
              <Figure
                label={t("reports.attendance.members")}
                value={String(summary.members)}
                hue="indigo"
                sub={t("reports.attendance.peopleSub")}
              />
              <Figure
                label={t("reports.attendance.bestDay")}
                value={summary.best ? String(summary.best.present) : "0"}
                hue="fern"
                sub={
                  summary.best
                    ? `${summary.best.name} · ${shortDate(summary.best.occursOn)}`
                    : t("reports.none")
                }
              />
              <Figure
                label={t("reports.attendance.held")}
                value={String(summary.held)}
                hue="teal"
                sub={plural("reports.attendance.heldSub", byName.length)}
              />
            </div>

            <Line
              title={t("reports.attendance.overTime")}
              hue="violet"
              aside={t("reports.attendance.averageLine", { count: String(summary.average) })}
              points={services.map((one) => ({
                key: one.occurrenceId,
                label: `${one.name} · ${shortDate(one.occursOn)}`,
                value: one.present,
              }))}
            />

            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
              <Donut
                title={t("reports.attendance.share")}
                slices={slices}
                total={slices.reduce((all, one) => all + one.value, 0)}
                totalLabel={t("reports.attendance.seats")}
              />
              <RowBars
                title={t("reports.attendance.byWeekday")}
                rows={weekdays.map((one) => ({
                  key: String(one.weekday),
                  label: dayName(one.weekday),
                  value: one.average,
                  note: plural("reports.attendance.timesHeld", one.held),
                }))}
              />
            </div>

            <PagedTable
              title={t("reports.attendance.byService")}
              columns={[
                t("reports.service"),
                t("reports.held"),
                t("reports.average"),
                t("reports.best"),
                t("reports.members"),
              ]}
              rows={eachService}
            />

            <PagedTable
              title={t("reports.attendance.everyService")}
              columns={[t("reports.service"), t("reports.date"), t("reports.members")]}
              rows={everyService}
            />
          </>
        )}
      </ReportFrame>
    </AppShell>
  );
}
