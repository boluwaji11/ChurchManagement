import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, CalendarDays } from "lucide-react";
import {
  withTenant, getTeam, canManageTeams, canLeadTeams, leadsTeam,
} from "@hearth/db";
import { Button, HueDot, type Hue } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle, Section } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { Positions } from "./positions";
import { Roster } from "./roster";

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

  const { team, mine } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      team: await getTeam(tx, id),
      mine: canManage ? true : await leadsTeam(tx, id, session.userId),
    }),
  );

  if (!team) notFound();
  if (!mine) redirect(`/serving?church=${session.tenantSlug}`);

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/serving?church=${session.tenantSlug}`}>
            <ChevronLeft aria-hidden /> {t("serving.back")}
          </Link>
        </Button>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HueDot hue={team.hue as Hue} />
            <PageTitle
              title={team.name}
              lede={team.description ?? undefined}
              className="mb-0"
            />
          </div>
          <Button asChild>
            <Link href={`/serving/${team.id}/schedule?church=${session.tenantSlug}`}>
              <CalendarDays /> {t("plan.open")}
            </Link>
          </Button>
        </div>

        <Section title={t("serving.positions")}>
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
        </Section>

        <Section title={t("serving.roster")}>
          <Roster
            church={session.tenantSlug}
            teamId={team.id}
            positions={team.positions.map((p) => ({ id: p.id, name: p.name }))}
            members={team.members.map((member) => ({
              id: member.id,
              personId: member.personId,
              name: member.name,
              role: member.role,
              joinedOn: member.joinedOn,
              positions: member.positions,
            }))}
          />
        </Section>
      </main>
    </>
  );
}
