import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
  milestoneCounts, milestoneList, newMembers,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
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
 * R18.8. The milestones a church marked, and who joined.
 *
 * Birthdays and anniversaries have their own screen already (R2.11), because
 * they are read every week rather than every quarter. This is the record of
 * what happened: baptisms, dedications, membership classes, and the people who
 * came off the end of all of it as members.
 */
export default async function MilestonesReport({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const session = await requireSession();
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return <Denied role={session.role} action="readReports" church={session.tenantSlug} />;
  }

  const window = windowOf(days);

  const { counts, list, joined } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      const range = { from: backBy(clock.date, window), to: clock.date };
      return {
        counts: await milestoneCounts(tx, range),
        list: await milestoneList(tx, range),
        joined: await newMembers(tx, range),
      };
    },
  );

  const here = ``;
  const kindName = (kind: string) => t(`milestone.kind.${kind}` as never);

  const baptisms = counts.find((one) => one.kind === "baptism")?.count ?? 0;
  const dedications = counts.find((one) => one.kind === "child_dedication")?.count ?? 0;
  const classes = counts.find((one) => one.kind === "membership_class")?.count ?? 0;

  /* R18.8. How long a first visit takes to become a membership. The median
     rather than the mean, because one person who joined after four years
     drags an average nobody recognises. */
  const waits = joined
    .map((one) => one.daysToJoin)
    .filter((one): one is number => one !== null && one >= 0)
    .sort((a, b) => a - b);
  const median = waits.length === 0 ? null : waits[Math.floor(waits.length / 2)]!;

  const milestoneRows: Row[] = list.map((one) => ({
    key: one.id,
    href: `/members/${one.slug}${here}`,
    cells: [
      { text: one.name },
      { text: kindName(one.kind) },
      { text: shortDate(one.occurredOn) },
    ],
  }));

  const joinedRows: Row[] = joined.map((one) => ({
    key: one.memberId,
    href: `/members/${one.slug}${here}`,
    cells: [
      { text: one.name },
      { text: shortDate(one.membershipDate) },
      { text: one.firstVisitOn ? shortDate(one.firstVisitOn) : "", muted: true },
      {
        text: one.daysToJoin === null || one.daysToJoin < 0
          ? ""
          : t("reports.milestones.days", { count: String(one.daysToJoin) }),
        numeric: true,
      },
    ],
  }));

  return (
    <AppShell session={session} title={t("reports.title")} wide>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.milestones.title")}
        window={window}
        path="milestones"
      >
        {list.length === 0 && joined.length === 0 ? (
          <Empty icon="history" title={t("reports.none")} />
        ) : (
          <>
            <Figures>
              <Figure
                label={t("reports.milestones.joined")}
                value={String(joined.length)}
                hue="fern"
                sub={
                  median === null
                    ? t("reports.milestones.noWait")
                    : t("reports.milestones.medianWait", { days: String(median) })
                }
              />
              <Figure
                label={t("milestone.kind.baptism")}
                value={String(baptisms)}
                hue="sky"
                sub={t("reports.milestones.inWindow")}
              />
              <Figure
                label={t("milestone.kind.child_dedication")}
                value={String(dedications)}
                hue="violet"
                sub={t("reports.milestones.inWindow")}
              />
              <Figure
                label={t("milestone.kind.membership_class")}
                value={String(classes)}
                hue="amber"
                sub={t("reports.milestones.inWindow")}
              />
            </Figures>

            {counts.length > 0 ? (
              <RowBars
                title={t("reports.milestones.byKind")}
                rows={counts.map((one) => ({
                  key: one.kind,
                  label: kindName(one.kind),
                  value: one.count,
                }))}
              />
            ) : null}

            {joinedRows.length > 0 ? (
              <PagedTable
                title={t("reports.milestones.whoJoined")}
                columns={[
                  t("reports.serving.person"),
                  t("reports.milestones.joinedOn"),
                  t("reports.milestones.firstVisit"),
                  t("reports.milestones.took"),
                ]}
                rows={joinedRows}
              />
            ) : null}

            <PagedTable
              title={t("reports.milestones.everyOne")}
              columns={[
                t("reports.serving.person"),
                t("reports.milestones.kind"),
                t("reports.milestones.when"),
              ]}
              rows={milestoneRows}
            />
          </>
        )}
      </ReportFrame>
    </AppShell>
  );
}
