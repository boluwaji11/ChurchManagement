import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
  groupParticipation, groupHealth, groupsByType, groupMeetingsByMonth,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { Empty } from "@/components/empty";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { ReportFrame, backBy, windowOf } from "../frame";
import { Figure, Figures } from "../figure";
import { Line, RowBars } from "../charts";
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
 * R18.6. Group participation and group health.
 *
 * The figure a church came for is the first one: how many of our members are
 * in a group at all. The one it needed is the table, sorted so the groups
 * nobody has heard from are at the top.
 */
export default async function GroupsReport({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; days?: string }>;
}) {
  const { church, days } = await searchParams;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return <Denied role={session.role} action="readReports" church={session.tenantSlug} />;
  }

  const window = windowOf(days);

  const { summary, rows, types, months } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      const range = { from: backBy(clock.date, window), to: clock.date };
      return {
        summary: await groupParticipation(tx, range),
        rows: await groupHealth(tx, range),
        types: await groupsByType(tx),
        months: await groupMeetingsByMonth(tx, range),
      };
    },
  );

  const label = (month: string) =>
    new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
      month: "short", year: "numeric",
    });

  const here = `?church=${session.tenantSlug}`;

  const table: Row[] = rows.map((one) => ({
    key: one.id,
    href: `/groups/${one.slug}${here}`,
    cells: [
      { text: one.name, hue: one.hue },
      { text: one.type ?? "", muted: true },
      { text: String(one.roster), numeric: true },
      { text: String(one.held), numeric: true },
      { text: one.held === 0 ? "" : String(one.average), numeric: true },
      {
        text: one.held === 0 ? "" : `${one.turnout}%`,
        pill: one.held === 0
          ? undefined
          : one.turnout >= 60 ? "fern" : one.turnout >= 35 ? "amber" : "rose",
      },
      {
        text: one.lastMetOn ? shortDate(one.lastMetOn) : t("reports.groups.neverMet"),
        muted: !one.lastMetOn,
      },
    ],
  }));

  return (
    <AppShell session={session} title={t("reports.title")} wide>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.groups.title")}
        window={window}
        path="groups"
      >
        {summary.groups === 0 ? (
          <Empty icon="group" title={t("reports.none")} />
        ) : (
          <>
            <Figures>
              <Figure
                label={t("reports.groups.inAGroup")}
                value={`${summary.rate}%`}
                hue={summary.rate >= 50 ? "fern" : summary.rate >= 30 ? "amber" : "rose"}
                sub={t("reports.groups.inAGroupSub", {
                  count: String(summary.inAGroup),
                  of: String(summary.counted),
                })}
              />
              <Figure
                label={t("reports.groups.running")}
                value={String(summary.groups)}
                hue="sky"
                sub={plural("reports.groups.runningSub", summary.meeting)}
              />
              <Figure
                label={t("reports.groups.silent")}
                value={String(summary.silent)}
                hue={summary.silent === 0 ? "teal" : "rose"}
                sub={t("reports.groups.silentSub")}
              />
              <Figure
                label={t("reports.groups.average")}
                value={String(summary.average)}
                hue="violet"
                sub={
                  summary.leaderless === 0
                    ? t("reports.groups.allLed")
                    : plural("reports.groups.leaderless", summary.leaderless)
                }
              />
            </Figures>

            <Line
              title={t("reports.groups.overTime")}
              hue="violet"
              points={months.map((one) => ({
                key: one.month,
                label: label(one.month),
                value: one.average,
              }))}
            />

            {/* R24.4. Each kind of group in the hue the church gave that kind,
                which is the same hue it wears on the groups screen. */}
            <RowBars
              title={t("reports.groups.byType")}
              rows={types.map((one) => ({
                key: one.id ?? "none",
                label: one.name ?? t("reports.groups.noType"),
                value: one.members,
                note: plural("reports.groups.typeNote", one.groups),
              }))}
            />

            <PagedTable
              title={t("reports.groups.each")}
              columns={[
                t("reports.groups.group"),
                t("reports.groups.kind"),
                t("reports.groups.roster"),
                t("reports.groups.met"),
                t("reports.groups.average"),
                t("reports.groups.turnout"),
                t("reports.groups.lastMet"),
              ]}
              rows={table}
            />
          </>
        )}
      </ReportFrame>
    </AppShell>
  );
}
