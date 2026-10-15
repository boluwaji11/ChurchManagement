import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
  servingCoverage, coverageByTeam, servingLoad, expiringChecks,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { Screen } from "@/components/screen";
import { requireScreen } from "@/lib/shell-data";
import { Denied } from "@/components/denied";
import { Empty } from "@/components/empty";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { ReportFrame, backBy, windowOf } from "../frame";
import { Figure, Figures } from "../figure";
import { RowBars } from "../charts";
import { PagedTable, type Row } from "../paged-table";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** How far ahead a church wants warning that a check runs out. */
const WARN_WITHIN_DAYS = 90;

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("reports.title"));
}

/**
 * R18.7. Volunteer coverage, who is carrying it, and whose check runs out.
 *
 * The last table is the one with a deadline on it. Everything else here is a
 * church managing its rota; a check that expires under somebody already down
 * for a children's room is a safeguarding question.
 */
export default async function ServingReport({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const session = await requireScreen();
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return <Denied role={session.role} action="readReports" church={session.tenantSlug} />;
  }

  const window = windowOf(days);

  const { summary, teams, load, checks } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      const range = { from: backBy(clock.date, window), to: clock.date };
      return {
        summary: await servingCoverage(tx, range),
        teams: await coverageByTeam(tx, range),
        load: await servingLoad(tx, range),
        checks: await expiringChecks(tx, { within: WARN_WITHIN_DAYS, today: clock.date }),
      };
    },
  );

  const here = ``;

  const loadRows: Row[] = load.map((one) => ({
    key: one.memberId,
    href: `/members/${one.slug}${here}`,
    cells: [
      { text: one.name },
      { text: String(one.served), numeric: true },
      { text: one.declined === 0 ? "" : String(one.declined), numeric: true, muted: true },
      {
        text: one.everyNth === null ? "" : plural("reports.serving.everyNth", one.everyNth),
        pill: one.everyNth === null ? undefined : one.everyNth <= 2 ? "rose" : undefined,
      },
      { text: one.lastServedOn ? shortDate(one.lastServedOn) : "", muted: true },
    ],
  }));

  const checkRows: Row[] = checks.map((one) => ({
    key: one.memberId,
    href: `/members/${one.slug}${here}`,
    cells: [
      { text: one.name },
      { text: one.expiresOn ? shortDate(one.expiresOn) : "" },
      {
        text: one.daysLeft === null
          ? ""
          : one.daysLeft < 0
            ? plural("reports.serving.ranOut", Math.abs(one.daysLeft))
            : plural("reports.serving.daysLeft", one.daysLeft),
        pill: one.daysLeft === null ? undefined : one.daysLeft < 0 ? "rose" : "amber",
      },
      {
        text: one.scheduledWithChildren ? t("reports.serving.withChildren") : "",
        pill: one.scheduledWithChildren ? "rose" : undefined,
      },
    ],
  }));

  /* R10.9. The pairing the church has no other way to notice. */
  const atRisk = checks.filter((one) => one.scheduledWithChildren).length;

  return (
    <Screen wide>
      <ReportFrame
        title={t("reports.serving.title")}
        window={window}
        path="serving"
      >
        {summary.asked === 0 && checks.length === 0 ? (
          <Empty icon="serving" title={t("reports.none")} />
        ) : (
          <>
            <Figures>
              <Figure
                label={t("reports.serving.covered")}
                value={`${summary.rate}%`}
                hue={summary.rate >= 90 ? "fern" : summary.rate >= 70 ? "amber" : "rose"}
                sub={t("reports.serving.coveredSub", {
                  filled: String(summary.filled),
                  asked: String(summary.asked),
                })}
              />
              <Figure
                label={t("reports.serving.waiting")}
                value={String(summary.waiting)}
                hue="sky"
                sub={t("reports.serving.waitingSub")}
              />
              <Figure
                label={t("reports.serving.volunteers")}
                value={String(summary.volunteers)}
                hue="violet"
                sub={plural("reports.serving.declinedSub", summary.declined)}
              />
              <Figure
                label={t("reports.serving.checks")}
                value={String(checks.length)}
                hue={atRisk > 0 ? "rose" : checks.length > 0 ? "amber" : "teal"}
                sub={
                  atRisk > 0
                    ? plural("reports.serving.atRisk", atRisk)
                    : t("reports.serving.checksSub")
                }
              />
            </Figures>

            {teams.length > 0 ? (
              <RowBars
                title={t("reports.serving.byTeam")}
                rows={teams.map((one) => ({
                  key: one.id,
                  label: one.name,
                  value: one.rate,
                  note: t("reports.serving.teamNote", {
                    filled: String(one.filled),
                    asked: String(one.asked),
                  }),
                }))}
              />
            ) : null}

            {/*
              R18.7, R10.9. First, because it is the one with a deadline. A
              church that reads only the top of this screen has read the thing
              that could matter on a service day.
            */}
            {checkRows.length > 0 ? (
              <PagedTable
                title={t("reports.serving.expiring")}
                columns={[
                  t("reports.serving.person"),
                  t("reports.serving.expires"),
                  t("reports.serving.left"),
                  t("reports.serving.scheduled"),
                ]}
                rows={checkRows}
              />
            ) : null}

            <PagedTable
              title={t("reports.serving.load")}
              columns={[
                t("reports.serving.person"),
                t("reports.serving.served"),
                t("reports.serving.declined"),
                t("reports.serving.howOften"),
                t("reports.serving.lastServed"),
              ]}
              rows={loadRows}
            />
          </>
        )}
      </ReportFrame>
    </Screen>
  );
}
