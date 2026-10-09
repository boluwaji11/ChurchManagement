import "server-only";
import {
  withTenant, getChurch, toCsv,
  attendanceByService, attendanceByName, attendanceSummary, attendanceByWeekday,
  growthByMonth, growthSummary, visitorFunnel, visitorList, type VisitorRow,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
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

export const BUILT_IN = ["attendance", "growth", "visitors"] as const;
export type BuiltIn = (typeof BUILT_IN)[number];

export const isBuiltIn = (raw: string | null | undefined): raw is BuiltIn =>
  (BUILT_IN as readonly string[]).includes(raw ?? "");

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

/** A run of values over time, which is the one thing worth a real chart. */
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

  return withTenant(
    { tenantId: session.tenantId, role: session.role },
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
