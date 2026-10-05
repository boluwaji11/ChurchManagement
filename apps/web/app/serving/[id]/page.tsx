import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Pencil } from "lucide-react";
import {
  withTenant, getTeam, canManageTeams, canLeadTeams, leadsTeam,
} from "@connectapp/db";
import { Button, IconButton } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
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

  if (!canLeadTeams(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const canManage = canManageTeams(session);

  const { team, mine } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // Found by its readable address or by its id, so the rest reads from the
      // record's own id rather than from whatever was in the URL.
      const found = await getTeam(tx, id);
      return {
        team: found,
        mine: canManage || !found
          ? true
          : await leadsTeam(tx, found.id, session.userId),
      };
    },
  );

  if (!team) notFound();
  if (!mine) redirect(`/serving?church=${session.tenantSlug}`);

  return (
    <AppShell
      session={session}
      max="max-w-[1100px]"
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
            <h2 className="font-display text-[22px] leading-[28px] text-fg">
              {t("serving.teamNamed", { name: team.name })}
            </h2>
            {team.description ? (
              <p className="mt-1 text-fg-muted">{team.description}</p>
            ) : null}
          </div>
        </div>

        {/* R10.1. Everything done to this team sits on its name's own line: the
            schedule it fills, changing it, and putting it away. */}
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={`/serving?church=${session.tenantSlug}&team=${team.id}`}>
              <CalendarDays /> {t("serving.openSchedule")}
            </Link>
          </Button>

          {canManage ? (
            <>
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
                  <IconButton label={t("action.edit")} variant="ghost">
                    <Pencil />
                  </IconButton>
                }
              />
              <ArchiveTeam church={session.tenantSlug} id={team.id} name={team.name} />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
        <h3 className="font-semibold text-fg">{t("serving.positions")}</h3>
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
          }))}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
        <h3 className="font-semibold text-fg">{t("serving.peopleCount")}</h3>
        <Roster
          church={session.tenantSlug}
          teamId={team.id}
          teamName={team.name}
          members={team.members.map((member) => ({
            id: member.id,
            memberId: member.memberId,
            personSlug: member.personSlug,
            name: member.name,
            role: member.role,
            joinedOn: member.joinedOn,
            positions: member.positions,
          }))}
        />
      </section>
      </div>
    </AppShell>
  );
}
