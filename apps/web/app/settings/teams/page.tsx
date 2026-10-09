import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listTeams, countArchivedTeams, positionsForTeams, getTeam, canManageTeams,
  canAnswerMessages,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { photoUrls } from "@/lib/photos";
import { TeamList, AddTeam } from "./team-list";
import { Denied } from "@/components/denied";
import { t, plural } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.teams"), church);
}

/**
 * R10.1. The teams a church runs, written down here.
 *
 * A team is a standing arrangement rather than a week's work: its name, its
 * colour and the positions it fills change once a year. Serving is where those
 * teams are scheduled, so the schedule stays the thing that screen is for.
 */
export default async function TeamsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);

  if (!canManageTeams(session)) {
    return <Denied role={session.role} action="manageTeams" church={session.tenantSlug} />;
  }

  const putAway = archived === "1";

  const { teams, positions, rosters, archivedCount } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const found = await listTeams(tx, putAway ? { archivedOnly: true } : {});
      // R10.1. Each team's roster, because the panel writes a team and its
      // people in one press and cannot go back for them once it is open.
      const held = await Promise.all(found.map((one) => getTeam(tx, one.id)));
      return {
        teams: found,
        archivedCount: await countArchivedTeams(tx),
        positions: await positionsForTeams(tx, found.map((one) => one.id)),
        rosters: Object.fromEntries(
          held.filter((one) => one !== null).map((one) => [one.id, one.members]),
        ),
      };
    },
  );

  // R2.9. Every face on every roster, signed in one round trip.
  const faces = await photoUrls(
    Object.values(rosters).flat().map((one) => one.photoKey),
  );

  return (
    <>
      {putAway ? (
        <Link
          href={`/settings/teams?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("serving.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "serving.archived.title" : "settings.tab.teams"}
        lede={putAway ? undefined : "settings.lede.teams"}
        action={
          !putAway && teams.length > 0
            ? <AddTeam church={session.tenantSlug} taken={teams.map((one) => one.name)} />
            : undefined
        }
      />

      <TeamList
        church={session.tenantSlug}
        putAway={putAway}
        canMessage={canAnswerMessages(session)}
        teams={teams.map((team) => {
          const of = positions[team.id] ?? [];
          return {
            id: team.id,
            slug: team.slug,
            name: team.name,
            description: team.description,
            members: (rosters[team.id] ?? []).map((one) => ({
              memberId: one.memberId,
              name: one.name,
              photoUrl: one.photoKey ? (faces[one.photoKey] ?? null) : null,
              membershipId: one.id,
            })),
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

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/settings/teams?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("serving.archived", archivedCount)}
        </Link>
      ) : null}
    </>
  );
}
