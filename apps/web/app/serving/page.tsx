import Link from "next/link";
import { redirect } from "next/navigation";
import {
  withTenant, listTeams, getChurch, answerCounts, canManageTeams, canLeadTeams,
} from "@hearth/db";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Teams } from "./teams";

export const dynamic = "force-dynamic";

/**
 * R10.1. The teams screen.
 *
 * A volunteer serves across the church, so this is one list of every team
 * rather than a schedule held inside each ministry. A team leader reaches their own
 * team from here and can change nothing else.
 */
export default async function ServingPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  if (!canLeadTeams(session.role)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const canManage = canManageTeams(session.role);
  const showArchived = canManage && params.archived === "1";

  const { teams, counts } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const found = await listTeams(tx, { includeArchived: showArchived });
      const today = churchNow(
        (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
      ).date;
      return {
        teams: found,
        // R10.6, R10.7. How each team's schedule stands from today onwards.
        counts: await answerCounts(tx, { teamIds: found.map((t) => t.id), from: today }),
      };
    },
  );

  return (
    <AppShell
      session={session}
      title={t("serving.title")}
    >
      <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
        {canManage ? (
          <Button variant="ghost" asChild>
            <Link
              href={`/serving?church=${session.tenantSlug}${showArchived ? "" : "&archived=1"}`}
            >
              {showArchived ? t("serving.title") : t("serving.showArchived")}
            </Link>
          </Button>
        ) : null}
      </div>

      <Teams
        church={session.tenantSlug}
        canManage={canManage}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          description: team.description,
          hue: team.hue,
          members: team.members,
          positions: team.positions,
          needsChecks: team.needsChecks,
          archived: team.archivedAt !== null,
          answers: counts[team.id] ?? { pending: 0, accepted: 0, declined: 0 },
        }))}
      />
    </AppShell>
  );
}
