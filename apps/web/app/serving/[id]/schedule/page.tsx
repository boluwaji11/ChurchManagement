import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  withTenant, getTeam, getChurch, canManageTeams, canLeadTeams, leadsTeam,
  upcomingServices, assignmentsForTeam,
} from "@connectapp/db";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { PageMeta } from "@/components/section";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { dayAndMonth, readableTime } from "@/lib/dates";
import { SchedulePlan } from "./plan";

export const dynamic = "force-dynamic";

/**
 * R10.3. One team's schedule across the services coming up.
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
  searchParams: Promise<{ church?: string; service?: string }>;
}) {
  const { id } = await params;
  const { church, service } = await searchParams;
  const session = await requireSession(church);

  if (!canLeadTeams(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const canManage = canManageTeams(session);

  const { team, mine, gatherings, chosen, entries } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const today = churchNow(profile?.timezone ?? "America/Chicago").date;
      const upcoming = await upcomingServices(tx, { from: today, limit: HOW_MANY });

      // Found by its readable address or by its id, so the rest reads from the
      // record's own id rather than from whatever was in the URL.
      const team = await getTeam(tx, id);

      // The one being planned: whichever was asked for, or the next one.
      const chosen = upcoming.find((o) => o.id === service)?.id ?? upcoming[0]?.id ?? null;

      return {
        team,
        mine: canManage || !team ? true : await leadsTeam(tx, team.id, session.userId),
        gatherings: upcoming,
        chosen,
        entries: chosen && team ? await assignmentsForTeam(tx, team.id, [chosen]) : [],
      };
    },
  );

  if (!team) notFound();
  if (!mine) redirect(`/serving?church=${session.tenantSlug}`);

  return (
    <AppShell
      session={session}
      title={t("plan.title")}
    >
      <Button variant="ghost" asChild className="mb-4">
        <Link href={`/serving/${team.slug}?church=${session.tenantSlug}`}>
          <ChevronLeft aria-hidden /> {team.name}
        </Link>
      </Button>

      <div className="mb-8 flex items-center gap-3">
        <PageMeta>{team.name}</PageMeta>
      </div>

      <SchedulePlan
        church={session.tenantSlug}
        teamId={team.slug}
        chosen={chosen ?? ""}
        gatherings={gatherings.map((o) => ({
          id: o.id,
          label: `${dayAndMonth(o.occursOn)} · ${o.name} ${readableTime(o.startsAt)}`,
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
          token: e.token,
        }))}
      />
    </AppShell>
  );
}
