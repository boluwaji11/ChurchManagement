import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarCheck, HandHeart, UserPlus, Users } from "lucide-react";
import {
  withTenant, getChurch, dashboard, attendanceByService, setupProgress,
  canEditPeople, canReadIncidents,
} from "@hearth/db";
import { StatTile } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { SetupChecklist } from "./checklist";
import { Weeks } from "./weeks";

export const dynamic = "force-dynamic";

/** How far back the line of weeks reads. */
const WEEKS = 12;

/** The same date, a number of days earlier, as YYYY-MM-DD. */
function backBy(iso: string, days: number): string {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() - days);
  return at.toISOString().slice(0, 10);
}

/**
 * R18.1, R22.1. The screen a church opens the week on.
 *
 * Four numbers, what has been happening to attendance, and the two lists that
 * are actually work: who has turned up that nobody has spoken to, and what is
 * overdue. Everything here is counted from the record when it is asked for, so
 * a church can trust it enough to act on it.
 *
 * No money. That work is deferred, and a dashboard with a blank where the
 * giving should be is worse than a dashboard without it.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // Somebody who is not staff has their own screen, and this is not it.
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const { numbers, weeks, setup, today } = await withTenant(ctx, async (tx) => {
    const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
    return {
      today: clock.date,
      numbers: await dashboard(tx, clock.date),
      weeks: await attendanceByService(tx, {
        from: backBy(clock.date, WEEKS * 7),
        to: clock.date,
      }),
      setup: await setupProgress(tx, session.tenantId),
    };
  });

  const last = numbers.lastService;
  const delta = last && last.average > 0 ? last.present - last.average : undefined;

  return (
    <AppShell session={session} title={t("dashboard.title")}>
      {/* R22.1. Here while there is something left to do, and gone afterwards
          rather than sitting in the settings of a church that finished in
          March. */}
      {!setup.complete && !setup.dismissed ? (
        <SetupChecklist church={session.tenantSlug} progress={setup} />
      ) : null}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <StatTile
          label={t("dashboard.attendance")}
          value={last ? String(last.present) : "0"}
          hue="violet"
          delta={delta}
          caption={last ? `${last.name} · ${shortDate(last.occursOn)}` : t("dashboard.noAttendance")}
          icon={<CalendarCheck className="size-4" />}
        />
        <StatTile
          label={t("dashboard.newPeople")}
          value={String(numbers.newThisMonth)}
          hue="fern"
          caption={t("dashboard.thisMonth")}
          icon={<Users className="size-4" />}
        />
        <StatTile
          label={t("dashboard.visitors")}
          value={String(numbers.visitors.total)}
          hue="amber"
          caption={
            numbers.visitors.uncontacted > 0
              ? plural("dashboard.uncontacted", numbers.visitors.uncontacted)
              : t("dashboard.allContacted")
          }
          icon={<UserPlus className="size-4" />}
        />
        <StatTile
          label={t("dashboard.followUps")}
          value={String(numbers.followUps.open)}
          hue={numbers.followUps.overdue > 0 ? "rose" : "teal"}
          caption={
            numbers.followUps.overdue > 0
              ? plural("dashboard.overdue", numbers.followUps.overdue)
              : t("dashboard.noneOverdue")
          }
          icon={<HandHeart className="size-4" />}
        />
      </div>

      {/* R18.2. What has been happening, which is the question the number
          above cannot answer on its own. */}
      <Weeks services={weeks} today={today} />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <Shortcut
          href={`/followups?church=${session.tenantSlug}`}
          label={t("dashboard.openFollowUps")}
          detail={
            numbers.followUps.overdue > 0
              ? plural("dashboard.overdue", numbers.followUps.overdue)
              : plural("dashboard.openCount", numbers.followUps.open)
          }
        />
        <Shortcut
          href={`/serving?church=${session.tenantSlug}`}
          label={t("dashboard.coverage")}
          detail={
            numbers.coverageGaps > 0
              ? plural("dashboard.gaps", numbers.coverageGaps)
              : t("dashboard.covered")
          }
        />
        <Shortcut
          href={`/reports?church=${session.tenantSlug}`}
          label={t("reports.title")}
          detail={t("dashboard.reportsDetail")}
        />
      </div>
    </AppShell>
  );
}

/** R24.6. One thing to go and do, as a tile that opens where it is done. */
function Shortcut({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-4 transition-colors hover:bg-sunken"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold text-fg">{label}</span>
        <span className="text-caption text-fg-muted">{detail}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
    </Link>
  );
}
