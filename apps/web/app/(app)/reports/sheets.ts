import "server-only";
import {
  withTenant, getChurch, toCsv,
  attendanceByService, attendanceByName, attendanceSummary, attendanceByWeekday,
  growthByMonth, growthSummary, visitorFunnel, visitorList, type VisitorRow,
  givingTotals, givingByMonth, givingByFund, lapsedGivers, firstTimeGivers,
  groupParticipation, groupHealth, groupMeetingsByMonth,
  servingCoverage, coverageByTeam, servingLoad, expiringChecks,
  milestoneCounts, milestoneList, newMembers,
  connectedness, connectednessSummary,
  canEditPeople, canReadIncidents, canReadGivingAmounts,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { backBy, type Window } from "./frame";
import type { Session } from "@/lib/session";

/**
 * R18.10. What a built-in report is, apart from the screen it is drawn on.
 *
 * The three reports a church gets without building one each have a spreadsheet,
 * a sheet of paper and a deck, and all three used to mean reading the same
 * figures out of the same repository in three places. This is that reading, done
 * once: the headline numbers, the tables and the one series worth a chart.
 *
 * The screens keep their own charts, which are interactive and belong to the
 * browser. What leaves the product goes through here.
 */

/**
 * R18.3. Where a visitor has got to, which is what the ring splits them by.
 *
 * Here rather than on the screen, because the figure across the top, the ring,
 * the list and the file all have to agree about what "connected" means.
 */
export function standing(one: VisitorRow): "connected" | "returned" | "once" {
  if (one.inGroup || one.serving) return "connected";
  return one.visits > 1 ? "returned" : "once";
}

export const BUILT_IN = [
  "attendance", "growth", "visitors", "groups", "serving", "milestones",
  "connected", "giving",
] as const;
export type BuiltIn = (typeof BUILT_IN)[number];

export const isBuiltIn = (raw: string | null | undefined): raw is BuiltIn =>
  (BUILT_IN as readonly string[]).includes(raw ?? "");

/**
 * R18.10, R1.5. Who may take this report off the screen.
 *
 * The same answer the screen gives, asked in one place, because a file is the
 * report: a giving report in a spreadsheet is every amount in it, and the
 * route that writes one has to ask the question the page asked.
 */
export function mayRead(which: BuiltIn, session: Session): boolean {
  if (which === "giving") return canReadGivingAmounts(session);
  return canEditPeople(session) || canReadIncidents(session);
}

/** One of the numbers across the top of a report. */
export interface SheetFigure {
  label: string;
  value: string;
  sub: string | null;
}

export interface SheetTable {
  kind: "table";
  title: string;
  columns: string[];
  /** Which columns are numbers, so they line up right on paper and in a deck. */
  numeric: boolean[];
  rows: string[][];
}

/** A series of values over time, which is what the chart is drawn from. */
export interface SheetSeries {
  kind: "series";
  title: string;
  /** What the line is called in the deck's legend. */
  name: string;
  points: { label: string; value: number }[];
}

export type SheetBlock = SheetTable | SheetSeries;

export interface ReportSheet {
  which: BuiltIn;
  title: string;
  /** How far back it reads, as the screen says it. */
  window: string;
  /** The day it was asked for, where the church is. */
  asked: string;
  figures: SheetFigure[];
  blocks: SheetBlock[];
  /**
   * R18.10. The one table a spreadsheet is.
   *
   * A CSV holds one grid, so each report names which of its tables that is:
   * the rows a church works through rather than the summary above them.
   */
  csv: SheetTable;
}

const figure = (label: string, value: string, sub: string | null = null): SheetFigure =>
  ({ label, value, sub });

const table = (
  title: string,
  columns: string[],
  numeric: boolean[],
  rows: string[][],
): SheetTable => ({ kind: "table", title, columns, numeric, rows });

export async function sheetFor(
  which: BuiltIn,
  session: Session,
  window: Window,
): Promise<ReportSheet> {
  const windowLabel = t(`reports.window.${window}` as never);

  /* R1.5. The permissions go with it: a giving read refuses without them,
     and refusing is the point. */
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  return withTenant(
    ctx,
    async (tx) => {
      const clock = churchNow(
        (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
      );
      const range = { from: backBy(clock.date, window), to: clock.date };
      const frame = { which, window: windowLabel, asked: clock.date };

      if (which === "attendance") {
        const [services, byName, summary, weekdays] = await Promise.all([
          attendanceByService(tx, range),
          attendanceByName(tx, range),
          attendanceSummary(tx, range),
          attendanceByWeekday(tx, range),
        ]);

        const change = summary.average - summary.before;
        const dayName = (weekday: number) =>
          new Date(Date.UTC(2024, 0, 7 + weekday)).toLocaleDateString(undefined, {
            weekday: "long",
          });

        const every = table(
          t("reports.attendance.everyService"),
          [t("reports.service"), t("reports.date"), t("reports.members")],
          [false, false, true],
          [...services].reverse().map((one) => [
            one.name, shortDate(one.occursOn), String(one.present),
          ]),
        );

        return {
          ...frame,
          title: t("reports.attendance.title"),
          figures: [
            figure(
              t("reports.attendance.average"),
              String(summary.average),
              summary.before === 0
                ? t("reports.attendance.noBefore")
                : t("reports.attendance.vsBefore", {
                    delta: `${change > 0 ? "+" : ""}${change}`,
                  }),
            ),
            figure(
              t("reports.attendance.members"),
              String(summary.members),
              t("reports.attendance.peopleSub"),
            ),
            figure(
              t("reports.attendance.bestDay"),
              summary.best ? String(summary.best.present) : "0",
              summary.best
                ? `${summary.best.name} · ${shortDate(summary.best.occursOn)}`
                : t("reports.none"),
            ),
            figure(
              t("reports.attendance.held"),
              String(summary.held),
              plural("reports.attendance.heldSub", byName.length),
            ),
          ],
          blocks: [
            {
              kind: "series" as const,
              title: t("reports.attendance.overTime"),
              name: t("reports.members"),
              points: services.map((one) => ({
                label: shortDate(one.occursOn),
                value: one.present,
              })),
            },
            table(
              t("reports.attendance.byService"),
              [
                t("reports.service"), t("reports.held"), t("reports.average"),
                t("reports.best"), t("reports.members"),
              ],
              [false, true, true, true, true],
              byName.map((one) => [
                one.name, String(one.held), String(one.average),
                String(one.best), String(one.total),
              ]),
            ),
            table(
              t("reports.attendance.byWeekday"),
              [t("reports.date"), t("reports.average"), t("reports.held")],
              [false, true, true],
              weekdays.map((one) => [
                dayName(one.weekday), String(one.average), String(one.held),
              ]),
            ),
            every,
          ],
          csv: every,
        };
      }

      if (which === "milestones") {
        const [counts, list, joined] = await Promise.all([
          milestoneCounts(tx, range),
          milestoneList(tx, range),
          newMembers(tx, range),
        ]);

        const kindName = (kind: string) => t(`milestone.kind.${kind}` as never);

        /* The grid a church works through is who joined: it is the list that
           gets read out at a members' meeting. */
        const who = table(
          t("reports.milestones.whoJoined"),
          [
            t("reports.serving.person"), t("reports.milestones.joinedOn"),
            t("reports.milestones.firstVisit"), t("reports.milestones.took"),
          ],
          [false, false, false, true],
          joined.map((one) => [
            one.name,
            shortDate(one.membershipDate),
            one.firstVisitOn ? shortDate(one.firstVisitOn) : "",
            one.daysToJoin === null || one.daysToJoin < 0 ? "" : String(one.daysToJoin),
          ]),
        );

        return {
          ...frame,
          title: t("reports.milestones.title"),
          figures: [
            figure(
              t("reports.milestones.joined"),
              String(joined.length),
              t("reports.milestones.inWindow"),
            ),
            ...counts.slice(0, 3).map((one) =>
              figure(kindName(one.kind), String(one.count), t("reports.milestones.inWindow"))),
          ],
          blocks: [
            who,
            table(
              t("reports.milestones.everyOne"),
              [
                t("reports.serving.person"), t("reports.milestones.kind"),
                t("reports.milestones.when"),
              ],
              [false, false, false],
              list.map((one) => [one.name, kindName(one.kind), shortDate(one.occurredOn)]),
            ),
          ],
          csv: who,
        };
      }

      if (which === "connected") {
        const [summary, people] = await Promise.all([
          connectednessSummary(tx, range),
          connectedness(tx, range),
        ]);

        const yes = t("reports.connected.yes");
        const no = t("reports.connected.no");

        /* R18.9. Four boxes a person either has or has not, written out so a
           church can sort the file by the column it cares about. */
        const everyone = table(
          t("reports.connected.title"),
          [
            t("reports.serving.person"), t("reports.connected.attends"),
            t("reports.connected.gives"), t("reports.connected.serves"),
            t("reports.connected.inGroup"), t("reports.connected.shape"),
          ],
          [false, false, false, false, false, true],
          people.map((one) => [
            one.name,
            one.attends ? yes : no,
            one.gives ? yes : no,
            one.serves ? yes : no,
            one.inGroup ? yes : no,
            String(one.score),
          ]),
        );

        const of = { of: String(summary.counted) };

        return {
          ...frame,
          title: t("reports.connected.title"),
          figures: [
            figure(t("reports.connected.attends"), String(summary.attends),
              t("reports.connected.ofCounted", of)),
            figure(t("reports.connected.gives"), String(summary.gives),
              t("reports.connected.ofCounted", of)),
            figure(t("reports.connected.serves"), String(summary.serves),
              t("reports.connected.ofCounted", of)),
            figure(t("reports.connected.inGroup"), String(summary.inGroup),
              t("reports.connected.ofCounted", of)),
          ],
          blocks: [
            table(
              t("reports.connected.shape"),
              [t("reports.connected.shape"), t("reports.serving.person")],
              [false, true],
              summary.bands.map((count, at) => [
                plural("reports.connected.band", at), String(count),
              ]),
            ),
            everyone,
          ],
          csv: everyone,
        };
      }

      if (which === "serving") {
        const [summary, teams, load, checks] = await Promise.all([
          servingCoverage(tx, range),
          coverageByTeam(tx, range),
          servingLoad(tx, range),
          expiringChecks(tx, { within: 90, today: clock.date }),
        ]);

        const atRisk = checks.filter((one) => one.scheduledWithChildren).length;

        /* R18.10, R10.9. The grid a church works through is the checks, not
           the rota. It is the one with a date on it. */
        const expiring = table(
          t("reports.serving.expiring"),
          [
            t("reports.serving.person"), t("reports.serving.expires"),
            t("reports.serving.left"), t("reports.serving.scheduled"),
          ],
          [false, false, true, false],
          checks.map((one) => [
            one.name,
            one.expiresOn ? shortDate(one.expiresOn) : "",
            one.daysLeft === null ? "" : String(one.daysLeft),
            one.scheduledWithChildren ? t("reports.serving.withChildren") : "",
          ]),
        );

        return {
          ...frame,
          title: t("reports.serving.title"),
          figures: [
            figure(
              t("reports.serving.covered"),
              `${summary.rate}%`,
              t("reports.serving.coveredSub", {
                filled: String(summary.filled),
                asked: String(summary.asked),
              }),
            ),
            figure(
              t("reports.serving.waiting"),
              String(summary.waiting),
              t("reports.serving.waitingSub"),
            ),
            figure(
              t("reports.serving.volunteers"),
              String(summary.volunteers),
              plural("reports.serving.declinedSub", summary.declined),
            ),
            figure(
              t("reports.serving.checks"),
              String(checks.length),
              atRisk > 0
                ? plural("reports.serving.atRisk", atRisk)
                : t("reports.serving.checksSub"),
            ),
          ],
          blocks: [
            table(
              t("reports.serving.byTeam"),
              [
                t("reports.serving.team"), t("reports.serving.asked"),
                t("reports.serving.filled"), t("reports.serving.covered"),
              ],
              [false, true, true, true],
              teams.map((one) => [
                one.name, String(one.asked), String(one.filled), `${one.rate}%`,
              ]),
            ),
            expiring,
            table(
              t("reports.serving.load"),
              [
                t("reports.serving.person"), t("reports.serving.served"),
                t("reports.serving.declined"), t("reports.serving.lastServed"),
              ],
              [false, true, true, false],
              load.map((one) => [
                one.name,
                String(one.served),
                String(one.declined),
                one.lastServedOn ? shortDate(one.lastServedOn) : "",
              ]),
            ),
          ],
          csv: expiring,
        };
      }

      if (which === "groups") {
        const [summary, rows, months] = await Promise.all([
          groupParticipation(tx, range),
          groupHealth(tx, range),
          groupMeetingsByMonth(tx, range),
        ]);

        /* R18.10. The grid a church works through, which is the group list
           rather than the summary above it. Quietest first, the same order
           the screen puts them in. */
        const each = table(
          t("reports.groups.each"),
          [
            t("reports.groups.group"), t("reports.groups.kind"),
            t("reports.groups.roster"), t("reports.groups.met"),
            t("reports.groups.average"), t("reports.groups.turnout"),
            t("reports.groups.lastMet"),
          ],
          [false, false, true, true, true, true, false],
          rows.map((one) => [
            one.name,
            one.type ?? "",
            String(one.roster),
            String(one.held),
            one.held === 0 ? "" : String(one.average),
            one.held === 0 ? "" : `${one.turnout}%`,
            one.lastMetOn ? shortDate(one.lastMetOn) : t("reports.groups.neverMet"),
          ]),
        );

        return {
          ...frame,
          title: t("reports.groups.title"),
          figures: [
            figure(
              t("reports.groups.inAGroup"),
              `${summary.rate}%`,
              t("reports.groups.inAGroupSub", {
                count: String(summary.inAGroup),
                of: String(summary.counted),
              }),
            ),
            figure(
              t("reports.groups.running"),
              String(summary.groups),
              plural("reports.groups.runningSub", summary.meeting),
            ),
            figure(
              t("reports.groups.silent"),
              String(summary.silent),
              t("reports.groups.silentSub"),
            ),
            figure(
              t("reports.groups.average"),
              String(summary.average),
              summary.leaderless === 0
                ? t("reports.groups.allLed")
                : plural("reports.groups.leaderless", summary.leaderless),
            ),
          ],
          blocks: [
            {
              kind: "series" as const,
              title: t("reports.groups.overTime"),
              name: t("reports.groups.average"),
              points: months.map((one) => ({ label: one.month, value: one.average })),
            },
            each,
          ],
          csv: each,
        };
      }

      if (which === "growth") {
        const [months, kept] = await Promise.all([
          growthByMonth(tx, range),
          growthSummary(tx, range),
        ]);

        const joined = months.reduce((all, one) => all + one.joined, 0);
        const lapsed = months.reduce((all, one) => all + one.lapsed, 0);

        const byMonth = table(
          t("reports.growth.monthByMonth"),
          [
            t("reports.month"), t("reports.joined"),
            t("reports.lapsed"), t("reports.net"),
          ],
          [false, true, true, true],
          months.map((one) => [
            one.month, String(one.joined), String(one.lapsed),
            `${one.net > 0 ? "+" : ""}${one.net}`,
          ]),
        );

        return {
          ...frame,
          title: t("reports.growth.title"),
          figures: [
            figure(
              t("reports.growth.kept"),
              `${kept.retention}%`,
              kept.before === 0
                ? t("reports.growth.noBefore")
                : t("reports.growth.keptSub", { kept: kept.kept, before: kept.before }),
            ),
            figure(t("reports.joined"), String(joined), t("reports.growth.joinedSub")),
            figure(t("reports.lapsed"), String(lapsed), t("reports.growth.lapsedSub")),
            figure(
              t("reports.net"),
              `${joined - lapsed > 0 ? "+" : ""}${joined - lapsed}`,
              t("reports.growth.netSub"),
            ),
          ],
          blocks: [
            {
              kind: "series" as const,
              title: t("reports.growth.netOverTime"),
              name: t("reports.net"),
              points: months.map((one) => ({ label: one.month, value: one.net })),
            },
            byMonth,
          ],
          csv: byMonth,
        };
      }

      if (which === "giving") {
        const [totals, months, byFund, lapsed, first] = await Promise.all([
          givingTotals(tx, range),
          givingByMonth(tx, range),
          givingByFund(tx, range),
          lapsedGivers(tx, ctx, range.from),
          firstTimeGivers(tx, ctx, range),
        ]);

        /* R13.9. Everything given to a fund the giver's intent binds. */
        const restricted = byFund
          .filter((fund) => fund.restricted)
          .reduce((sum, fund) => sum + fund.cents, 0);
        const average = totals.givers > 0
          ? Math.round(totals.cents / totals.givers)
          : 0;

        const funds = table(
          t("reports.giving.byFund"),
          [t("giving.col.fund"), t("giving.gift.amount"), t("giving.restricted")],
          [false, true, false],
          byFund.map((fund) => [
            fund.name, money(fund.cents), fund.restricted ? t("common.yes") : t("common.no"),
          ]),
        );

        return {
          ...frame,
          title: t("reports.giving.title"),
          figures: [
            figure(
              t("reports.giving.total"),
              money(totals.cents),
              plural("giving.givers.sub", totals.gifts),
            ),
            figure(
              t("reports.giving.givers"),
              String(totals.givers),
              t("reports.giving.average", { amount: money(average) }),
            ),
            figure(
              t("reports.giving.lapsed"),
              String(lapsed.length),
              t("reports.giving.lapsed.sub"),
            ),
            /* R13.9. What the giver's intent binds, apart from what it does
               not. A board asking what the church can spend is asking for the
               first of these two. */
            ...(restricted > 0
              ? [
                  figure(
                    t("giving.funds.available"),
                    money(totals.cents - restricted),
                    t("giving.funds.availableWhy"),
                  ),
                ]
              : []),
          ],
          blocks: [
            {
              kind: "series" as const,
              title: t("reports.giving.overTime"),
              name: t("giving.gift.amount"),
              points: months.map((one) => ({
                label: one.label,
                value: Math.round(one.value / 100),
              })),
            },
            funds,
            table(
              t("reports.giving.lapsed"),
              [t("reports.name"), t("reports.giving.lastGift"), t("giving.gift.amount")],
              [false, false, true],
              lapsed.map((one) => [one.name, shortDate(one.lastOn), money(one.cents)]),
            ),
            table(
              t("reports.giving.first"),
              [t("reports.name"), t("reports.giving.firstGift"), t("giving.gift.amount")],
              [false, false, true],
              first.map((one) => [one.name, shortDate(one.firstOn), money(one.cents)]),
            ),
          ],
          csv: funds,
        };
      }

      const [steps, visitors] = await Promise.all([
        visitorFunnel(tx, range),
        visitorList(tx, range),
      ]);

      const yes = t("common.yes");
      const no = t("common.no");

      const who = table(
        t("reports.visitors.list"),
        [
          t("reports.name"), t("reports.firstVisit"), t("reports.visits"),
          t("reports.lastSeen"), t("reports.standing.connected"), t("reports.step.serving"),
          t("person.status"), t("reports.followUp"),
        ],
        [false, false, true, false, false, false, false, false],
        visitors.map((one) => [
          one.name,
          shortDate(one.firstVisitOn),
          String(one.visits),
          one.lastSeenOn ? shortDate(one.lastSeenOn) : "",
          one.inGroup ? yes : no,
          one.serving ? yes : no,
          one.status,
          one.contacted ? t("reports.contacted") : t("reports.notContacted"),
        ]),
      );

      /* The same four numbers the screen puts across the top, counted the
         same way, so a church reading the file and a church reading the
         screen are reading one report. */
      const returned = steps[1]?.members ?? 0;
      const where = (key: "connected" | "returned" | "once") =>
        visitors.filter((one) => standing(one) === key).length;
      const uncontacted = visitors
        .filter((one) => !one.contacted && standing(one) === "once").length;

      return {
        ...frame,
        title: t("reports.visitors.title"),
        figures: [
          figure(
            t("reports.visitors.first"),
            String(visitors.length),
            t("reports.visitors.firstSub"),
          ),
          figure(
            t("reports.visitors.returned"),
            `${steps[1]?.rate ?? 0}%`,
            plural("reports.visitors.returnedSub", returned),
          ),
          figure(
            t("reports.visitors.connected"),
            String(where("connected")),
            t("reports.visitors.connectedSub"),
          ),
          figure(
            t("reports.visitors.waiting"),
            String(uncontacted),
            t("reports.visitors.waitingSub"),
          ),
        ],
        blocks: [
          table(
            t("reports.visitors.journey"),
            [
              t("reports.standing.title"), t("reports.members"),
              t("reports.rate"), t("reports.elapsed"),
            ],
            [false, true, true, true],
            steps.map((one) => [
              t(`reports.step.${one.key}` as never),
              String(one.members),
              `${one.rate}%`,
              one.medianDays === null ? "" : String(one.medianDays),
            ]),
          ),
          table(
            t("reports.visitors.where"),
            [t("reports.standing.title"), t("reports.visitors.members")],
            [false, true],
            (["connected", "returned", "once"] as const).map((key) => [
              t(`reports.standing.${key}` as never), String(where(key)),
            ]),
          ),
          who,
        ],
        csv: who,
      };
    },
  );
}

/**
 * R18.10. A sheet's table as a spreadsheet.
 *
 * `toCsv` takes records, so the grid is turned back into them here: one place
 * rather than once per report.
 */
export function csvFrom(one: SheetTable): string {
  return toCsv(
    one.rows.map((row) =>
      Object.fromEntries(one.columns.map((column, at) => [column, row[at] ?? ""]))),
    one.columns,
  );
}
