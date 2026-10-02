"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck, RotateCcw } from "lucide-react";
import {
  Banner, Button, Card, EmptyState, HueDot, Badge, type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { TeamDialog, ArchiveTeamDialog } from "./team-dialog";
import { archiveTeam } from "./actions";

export interface TeamCard {
  id: string;
  name: string;
  description: string | null;
  hue: string;
  members: number;
  positions: number;
  needsChecks: boolean;
  archived: boolean;
}

/**
 * R10.1. Every team the church runs.
 *
 * A card each, carrying the two numbers somebody opening this screen is
 * actually asking about: how many positions the team schedules and how many
 * people it has to fill them from.
 */
export function Teams({
  church,
  teams,
  canManage,
}: {
  church: string;
  teams: TeamCard[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const setArchived = (id: string, archived: boolean) => {
    const data = new FormData();
    data.set("church", church);
    data.set("id", id);
    data.set("archived", String(archived));
    startTransition(async () => {
      const result = await archiveTeam(data);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3">
          <TeamDialog
            church={church}
            title={t("serving.addTeam")}
            trigger={<Button><Plus /> {t("serving.addTeam")}</Button>}
          />
        </div>
      ) : null}

      {teams.length === 0 ? (
        <EmptyState title={t("serving.empty")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <li key={team.id}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/serving/${team.id}?church=${church}`}
                    className="flex items-center gap-2 font-display text-heading text-fg underline-offset-4 hover:underline"
                  >
                    <HueDot hue={team.hue as Hue} />
                    {team.name}
                  </Link>
                  {team.archived ? <Badge tone="neutral">{t("serving.archived")}</Badge> : null}
                </div>

                {team.description ? (
                  <p className="text-[length:var(--d-text-body)] text-fg-muted">
                    {team.description}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-3 text-caption text-fg-muted">
                  <span>{plural("serving.positionCount", team.positions)}</span>
                  <span>{plural("serving.memberCount", team.members)}</span>
                  {team.needsChecks ? (
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-4" aria-hidden />
                      {t("serving.needsChecks")}
                    </span>
                  ) : null}
                </div>

                {canManage ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <TeamDialog
                      church={church}
                      team={team}
                      title={t("serving.editTeam")}
                      trigger={
                        <Button variant="ghost">{t("action.edit")}</Button>
                      }
                    />
                    {team.archived ? (
                      <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={() => setArchived(team.id, false)}
                      >
                        <RotateCcw /> {t("serving.restore")}
                      </Button>
                    ) : (
                      <ArchiveTeamDialog
                        name={team.name}
                        pending={pending}
                        onConfirm={() => setArchived(team.id, true)}
                      />
                    )}
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
