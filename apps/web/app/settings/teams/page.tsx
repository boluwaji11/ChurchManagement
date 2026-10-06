import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  withTenant, listTeams, positionsForTeams, canManageTeams,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { TeamList, AddTeam } from "./team-list";

export const dynamic = "force-dynamic";

/**
 * R10.1. The teams a church runs, written down here.
 *
 * A team is a standing arrangement rather than a week's work: its name, its
 * colour and the positions it fills change once a year. Serving is where those
 * teams are scheduled, so the rota stays the thing that screen is for.
 */
export default async function TeamsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageTeams(session)) {
    return <Banner tone="info" title={t("settings.tab.teams")}>{t("forbidden.askAdmin")}</Banner>;
  }

  const { teams, positions } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const found = await listTeams(tx, { includeArchived: true });
      return {
        teams: found,
        positions: await positionsForTeams(tx, found.map((one) => one.id)),
      };
    },
  );

  return (
    <>
      <SettingsHeading
        title="settings.tab.teams"
        lede="settings.lede.teams"
        action={teams.length > 0 ? <AddTeam church={session.tenantSlug} /> : undefined}
      />

      <TeamList
        church={session.tenantSlug}
        teams={teams.map((team) => {
          const of = positions[team.id] ?? [];
          return {
            id: team.id,
            name: team.name,
            description: team.description,
            hue: team.hue,
            members: team.members,
            positions: of.map((one) => ({
              id: one.id,
              name: one.name,
              needed: one.needed,
              withChildren: one.withChildren,
              requiresCheck: one.requiresCheck,
            })),
            needsChecks: team.needsChecks,
            archived: team.archivedAt !== null,
          };
        })}
      />

      <Link
        href={`/serving?church=${session.tenantSlug}`}
        className="flex items-center gap-1.5 self-start font-medium text-primary"
      >
        {t("settings.teams.where")} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </>
  );
}
