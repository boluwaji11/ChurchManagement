import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
  visitorFunnel, visitorList, type VisitorRow,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { ReportFrame, backBy, windowOf } from "../frame";
import { Figure } from "../figure";
import { Donut, Funnel, Line, type Slice } from "../charts";
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

/** Where somebody has got to, which is what the ring splits them by. */
function standing(one: VisitorRow): "connected" | "returned" | "once" {
  if (one.inGroup || one.serving) return "connected";
  return one.visits > 1 ? "returned" : "once";
}

const STANDING_HUE = { connected: "fern", returned: "sky", once: "clay" } as const;

/**
 * R18.3. What happens after somebody first turns up.
 *
 * The PRD calls this the single most valuable report a small church can have,
 * and it is: every other number says how the church is doing, this one says
 * where it is losing members.
 *
 * So it does not stop at the rate. A church reading "forty per cent came back"
 * asks the same question every time, which is which of them did not and whether
 * anybody has spoken to them, and the list at the bottom answers it by name.
 */
export default async function VisitorReport({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; days?: string }>;
}) {
  const { church, days } = await searchParams;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <AppShell session={session} title={t("reports.title")}>
        <Denied role={session.role} action="buildReports" church={session.tenantSlug} />
      </AppShell>
    );
  }

  const window = windowOf(days);

  const { steps, visitors } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      const range = { from: backBy(clock.date, window), to: clock.date };
      return {
        steps: await visitorFunnel(tx, range),
        visitors: await visitorList(tx, range),
      };
    },
  );

  const elapsed = (count: number | null) =>
    count === null ? "" : count === 0 ? t("reports.sameDay") : plural("reports.days", count);

  const returned = steps[1]?.members ?? 0;
  const connected = visitors.filter((one) => standing(one) === "connected").length;
  const uncontacted = visitors.filter((one) => !one.contacted && standing(one) === "once").length;

  const slices: Slice[] = (["connected", "returned", "once"] as const)
    .map((key) => ({
      key,
      label: t(`reports.standing.${key}` as never),
      value: visitors.filter((one) => standing(one) === key).length,
      hue: STANDING_HUE[key],
    }))
    .filter((one) => one.value > 0);

  // First visits month by month, counted from the list rather than asked for
  // again. Oldest first, because a line is read left to right.
  const months = new Map<string, number>();
  for (const one of visitors) {
    const month = one.firstVisitOn.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  const points = [...months.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({
      key: month,
      label: new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
        month: "short", year: "numeric",
      }),
      value: count,
    }));

  const rows: Row[] = visitors.map((one) => {
    const where = standing(one);
    return {
      key: one.id,
      href: `/members/${one.slug}?church=${session.tenantSlug}`,
      cells: [
        { text: one.name },
        { text: shortDate(one.firstVisitOn), muted: true },
        { text: String(one.visits), numeric: true },
        { text: one.lastSeenOn ? shortDate(one.lastSeenOn) : t("reports.never"), muted: true },
        { text: t(`reports.standing.${where}` as never), pill: STANDING_HUE[where] },
        {
          text: one.contacted ? t("reports.contacted") : t("reports.notContacted"),
          muted: one.contacted,
        },
      ],
    };
  });

  return (
    <AppShell session={session} title={t("reports.title")} wide>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.visitors.title")}
        window={window}
        path="visitors"
      >
        {visitors.length === 0 ? (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("reports.none")}</p>
        ) : (
          <>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <Figure
                label={t("reports.visitors.first")}
                value={String(visitors.length)}
                hue="amber"
                sub={t("reports.visitors.firstSub")}
              />
              <Figure
                label={t("reports.visitors.returned")}
                value={`${steps[1]?.rate ?? 0}%`}
                hue="sky"
                sub={plural("reports.visitors.returnedSub", returned)}
              />
              <Figure
                label={t("reports.visitors.connected")}
                value={String(connected)}
                hue="fern"
                sub={t("reports.visitors.connectedSub")}
              />
              <Figure
                label={t("reports.visitors.waiting")}
                value={String(uncontacted)}
                hue={uncontacted > 0 ? "rose" : "teal"}
                sub={t("reports.visitors.waitingSub")}
              />
            </div>

            <Funnel
              title={t("reports.visitors.journey")}
              steps={steps.map((one) => ({
                key: one.key,
                label: t(`reports.step.${one.key}` as never),
                members: one.members,
                rate: one.rate,
                note: elapsed(one.medianDays),
              }))}
            />

            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
              <Donut
                title={t("reports.visitors.where")}
                slices={slices}
                total={visitors.length}
                totalLabel={t("reports.visitors.members")}
              />
              <Line
                title={t("reports.visitors.perMonth")}
                hue="amber"
                points={points}
              />
            </div>

            <PagedTable
              title={t("reports.visitors.list")}
              columns={[
                t("reports.name"),
                t("reports.firstVisit"),
                t("reports.visits"),
                t("reports.lastSeen"),
                t("reports.standing.title"),
                t("reports.followUp"),
              ]}
              rows={rows}
            />

            <p className="text-caption text-fg-muted">{t("reports.funnelNote")}</p>
          </>
        )}
      </ReportFrame>
    </AppShell>
  );
}
