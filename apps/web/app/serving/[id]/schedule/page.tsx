import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  withTenant, getTeam, getChurch, canManageTeams, canLeadTeams, leadsTeam,
  upcomingServices, assignmentsForTeam,
} from "@hearth/db";
import { Button, HueDot, type Hue } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { dayAndMonth, readableTime } from "@/lib/dates";
import { SchedulePlan } from "./plan";

export const dynamic = "force-dynamic";

/**
 * R10.3. One team's schedule across the gatherings coming up.
 *
 * Six of them, because a schedule built further out than that is rebuilt before it
 * is used, and a leader filling one service at a time is doing the work the way
 * it is actually done.
 */
const HOW_MANY = 6;

export default async function SchedulePlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canLeadTeams(session.role)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const canManage = canManageTeams(session.role);

  const { team, mine, gatherings, entries } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const today = churchNow(profile?.timezone ?? "America/Chicago").date;
      const upcoming = await upcomingServices(tx, { from: today, limit: HOW_MANY });

      return {
        team: await getTeam(tx, id),
        mine: canManage ? true : await leadsTeam(tx, id, session.userId),
        gatherings: upcoming,
        entries: await assignmentsForTeam(tx, id, upcoming.map((o) => o.id)),
      };
    },
  );

  if (!team) notFound();
  if (!mine) redirect(`/serving?church=${session.tenantSlug}`);

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/serving/${team.id}?church=${session.tenantSlug}`}>
            <ChevronLeft aria-hidden /> {team.name}
          </Link>
        </Button>

        <div className="mb-8 flex items-center gap-3">
          <HueDot hue={team.hue as Hue} />
          <PageTitle title={t("plan.title")} className="mb-0" />
        </div>

        <SchedulePlan
          church={session.tenantSlug}
          teamId={team.id}
          gatherings={gatherings.map((o) => ({
            id: o.id,
            name: o.name,
            day: dayAndMonth(o.occursOn),
            time: readableTime(o.startsAt),
          }))}
          positions={team.positions.map((p) => ({
            id: p.id,
            name: p.name,
            needed: p.needed,
          }))}
          entries={entries.map((e) => ({
            id: e.id,
            occurrenceId: e.occurrenceId,
            positionId: e.positionId,
            personName: e.personName,
            status: e.status,
            overridden: e.overridden,
          }))}
        />
      </main>
    </>
  );
}
