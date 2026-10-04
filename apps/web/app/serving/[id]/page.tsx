import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Pencil } from "lucide-react";
import {
  withTenant, getTeam, getChurch, listOccurrences, assignmentsForTeam,
  canManageTeams, canLeadTeams, leadsTeam,
} from "@hearth/db";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Positions } from "./positions";
import { Roster } from "./roster";
import { TeamDialog } from "../team-dialog";
import { ArchiveTeam } from "./archive-team";

export const dynamic = "force-dynamic";

/**
 * R10.1, R10.2. One team: what it schedules, and who is on it.
 *
 * A team leader opens their own team here. The positions are read-only for
 * them, because what a position requires is the church's decision, and the
 * schedule is theirs.
 */
export default async function TeamPage({
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

  const { team, mine, services, slots, monthName } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const clock = churchNow(profile?.timezone ?? "America/Chicago");
      const month = clock.date.slice(0, 7);
      const [y, m] = month.split("-").map(Number);
      const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();

      // R10.3. This month's gatherings, so each position can say how much of
      // the month it still owes and each member how much they are doing.
      const inMonth = await listOccurrences(tx, {
        from: `${month}-01`,
        to: `${month}-${String(last).padStart(2, "0")}`,
      });

      return {
        team: await getTeam(tx, id),
        mine: canManage ? true : await leadsTeam(tx, id, session.userId),
        services: inMonth,
        slots: inMonth.length
          ? await assignmentsForTeam(tx, id, inMonth.map((one) => one.id))
          : [],
        monthName: new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
          month: "long",
        }),
      };
    },
  );

  if (!team) notFound();
  if (!mine) redirect(`/serving?church=${session.tenantSlug}`);

  return (
    <AppShell
      session={session}
      title={team.name}
      max="max-w-[1100px]"
      action={
        <Button asChild>
          <Link href={`/serving?church=${session.tenantSlug}&team=${team.id}`}>
            <CalendarDays /> {t("serving.openSchedule")}
          </Link>
        </Button>
      }
    >
      <Link
        href={`/serving?church=${session.tenantSlug}&view=teams`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("serving.back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-2.5 size-3.5 shrink-0 rounded-[4px]"
            style={{ background: `var(--hue-${team.hue}-500)` }}
          />
          <div>
            <h2 className="font-display text-[28px] leading-[34px] text-fg">{team.name}</h2>
            {team.description ? (
              <p className="mt-1 text-fg-muted">{team.description}</p>
            ) : null}
          </div>
        </div>

        {/* R10.1. Changing the team itself, and putting it away, belong here
            rather than on the card that opens it. */}
        {canManage ? (
          <div className="flex items-center gap-2">
            <TeamDialog
              church={session.tenantSlug}
              team={{
                id: team.id,
                name: team.name,
                description: team.description,
                hue: team.hue,
              }}
              title={t("serving.editTeam")}
              trigger={
                <Button variant="secondary">
                  <Pencil /> {t("action.edit")}
                </Button>
              }
            />
            <ArchiveTeam church={session.tenantSlug} id={team.id} name={team.name} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
        <h3 className="flex items-baseline gap-2 font-semibold text-fg">
          {t("serving.positions")}
          <span className="text-[13px] font-normal text-fg-subtle">{team.positions.length}</span>
        </h3>
        <Positions
          church={session.tenantSlug}
          teamId={team.id}
          canManage={canManage}
          positions={team.positions.map((position) => ({
            id: position.id,
            name: position.name,
            needed: position.needed,
            withChildren: position.withChildren,
            requiresCheck: position.requiresCheck,
            filled: new Set(
              slots
                .filter((one) => one.positionId === position.id && one.status !== "declined")
                .map((one) => one.occurrenceId),
            ).size,
            services: services.length,
          }))}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
        <h3 className="flex items-baseline gap-2 font-semibold text-fg">
          {t("serving.peopleCount")}
          <span className="text-[13px] font-normal text-fg-subtle">{team.members.length}</span>
        </h3>
        <Roster
          church={session.tenantSlug}
          teamId={team.id}
          month={monthName}
          members={team.members.map((member) => ({
            id: member.id,
            personId: member.personId,
            name: member.name,
            role: member.role,
            joinedOn: member.joinedOn,
            positions: member.positions,
            scheduled: slots.filter(
              (one) => one.personId === member.personId && one.status !== "declined",
            ).length,
          }))}
        />
      </section>
      </div>
    </AppShell>
  );
}
