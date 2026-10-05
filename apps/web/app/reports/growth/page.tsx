import { redirect } from "next/navigation";
import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
  growthByMonth, growthSummary,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { ReportFrame, backBy, windowOf } from "../frame";
import { Figure } from "../figure";
import { Columns, Line } from "../charts";
import { PagedTable, type Row } from "../paged-table";

export const dynamic = "force-dynamic";

/**
 * R18.4. New, lapsed and the net change, month by month.
 *
 * "Lapsed" waits two months before it says so, because a church should not be
 * told it lost somebody who was on holiday.
 *
 * The number that matters most is at the top and it is not the roll: it is how
 * many of the people who came last window came again in this one. A church can
 * add names all year and still be emptying.
 */
export default async function GrowthReport({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; days?: string }>;
}) {
  const { church, days } = await searchParams;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const window = windowOf(days);

  const { months, kept } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      const range = { from: backBy(clock.date, window), to: clock.date };
      return {
        months: await growthByMonth(tx, range),
        kept: await growthSummary(tx, range),
      };
    },
  );

  const joined = months.reduce((all, one) => all + one.joined, 0);
  const lapsed = months.reduce((all, one) => all + one.lapsed, 0);
  const net = joined - lapsed;

  const label = (month: string) =>
    new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
      month: "short", year: "numeric",
    });

  const rows: Row[] = [...months].reverse().map((one) => ({
    key: one.month,
    cells: [
      { text: label(one.month) },
      { text: String(one.joined), numeric: true },
      { text: String(one.lapsed), numeric: true, muted: true },
      {
        text: one.net > 0 ? `+${one.net}` : String(one.net),
        pill: one.net > 0 ? "fern" : one.net < 0 ? "rose" : "clay",
      },
    ],
  }));

  return (
    <AppShell session={session} title={t("reports.title")} wide>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.growth.title")}
        window={window}
        path="growth"
      >
        {months.length === 0 ? (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("reports.none")}</p>
        ) : (
          <>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <Figure
                label={t("reports.growth.kept")}
                value={`${kept.retention}%`}
                hue={kept.retention >= 70 ? "fern" : kept.retention >= 50 ? "amber" : "rose"}
                sub={
                  kept.before === 0
                    ? t("reports.growth.noBefore")
                    : t("reports.growth.keptSub", {
                        kept: String(kept.kept),
                        before: String(kept.before),
                      })
                }
              />
              <Figure
                label={t("reports.joined")}
                value={String(joined)}
                hue="sky"
                sub={t("reports.growth.joinedSub")}
              />
              <Figure
                label={t("reports.lapsed")}
                value={String(lapsed)}
                hue="clay"
                sub={t("reports.growth.lapsedSub")}
              />
              <Figure
                label={t("reports.net")}
                value={net > 0 ? `+${net}` : String(net)}
                hue={net > 0 ? "fern" : net < 0 ? "rose" : "teal"}
                sub={t("reports.growth.netSub")}
              />
            </div>

            <Line
              title={t("reports.growth.netOverTime")}
              hue={net >= 0 ? "fern" : "rose"}
              points={months.map((one) => ({
                key: one.month,
                label: label(one.month),
                value: one.net,
              }))}
            />

            <Columns
              title={t("reports.growth.inAndOut")}
              series={[
                { label: t("reports.joined"), hue: "sky" },
                { label: t("reports.lapsed"), hue: "clay" },
              ]}
              groups={months.map((one) => ({
                key: one.month,
                label: label(one.month),
                values: [one.joined, one.lapsed],
              }))}
            />

            <PagedTable
              title={t("reports.growth.monthByMonth")}
              columns={[
                t("reports.month"),
                t("reports.joined"),
                t("reports.lapsed"),
                t("reports.net"),
              ]}
              rows={rows}
            />
          </>
        )}
      </ReportFrame>
    </AppShell>
  );
}
