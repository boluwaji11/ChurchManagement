"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck, Undo2 } from "lucide-react";
import { Badge, Banner, Button, LIFT } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { TeamPanel, type PositionDraft, type MemberDraft } from "../../schedule/team-panel";
import { archiveTeam } from "../../schedule/actions";

export interface TeamItem {
  id: string;
  name: string;
  description: string | null;
  members: MemberDraft[];
  positions: PositionDraft[];
  needsChecks: boolean;
  archived: boolean;
}

/** R10.1. The one place a team is written down, renamed or put away. */
export function TeamList({ church, teams }: { church: string; teams: TeamItem[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const live = teams.filter((one) => !one.archived);
  const archived = teams.filter((one) => one.archived);

  const setArchived = (id: string, archive: boolean) => {
    const data = new FormData();
    data.set("church", church);
    data.set("id", id);
    data.set("archived", archive ? "true" : "false");
    startTransition(async () => {
      const result = await archiveTeam(data);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      {live.length === 0 ? (
        <Empty
          icon="serving"
          title={t("settings.teams.none.title")}
          body={t("settings.teams.none.body")}
          action={<AddTeam church={church} />}
        />
      ) : (
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {live.map((team) => (
            <li key={team.id}>
              {/* R24.6. The whole tile opens the team's panel: its name, its
                  positions and who serves on it are all in there. */}
              <TeamPanel
                church={church}
                team={{
                  id: team.id,
                  name: team.name,
                  description: team.description,
                }}
                positions={team.positions}
                members={team.members}
                title={t("serving.editTeam")}
                trigger={
                  <button
                    type="button"
                    className={`flex h-full w-full cursor-pointer flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 text-left ${LIFT}`}
                  >
                    <span className="min-w-0 truncate font-semibold text-fg">{team.name}</span>

                    {team.positions.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5">
                        {team.positions.map(({ id, name }) => (
                          <span
                            key={id}
                            className="flex h-[26px] items-center rounded-full bg-sunken px-2.5 text-[12px] font-medium text-fg"
                          >
                            {name}
                          </span>
                        ))}
                      </span>
                    ) : null}

                    {team.needsChecks ? (
                      <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                        <ShieldCheck className="size-4" aria-hidden />
                        {t("serving.needsChecks")}
                      </span>
                    ) : null}

                    <span className="mt-auto w-full border-t border-sunken pt-3 text-[13px] text-fg-muted">
                      {[
                        plural("serving.volunteerCount", team.members.length),
                        plural("serving.positionCount", team.positions.length),
                      ].join(" · ")}
                    </span>
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-label text-fg-muted">{t("serving.archived")}</h2>
          {archived.map((team) => (
            <div key={team.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[length:var(--d-text-body)] text-fg-muted">
                {team.name}
                <Badge tone="neutral">{t("serving.archived")}</Badge>
              </span>
              <Button
                variant="ghost"
                disabled={pending}
                className="h-8 min-h-0 px-2.5 text-[13px]"
                onClick={() => setArchived(team.id, false)}
              >
                <Undo2 className="size-4" aria-hidden /> {t("serving.restore")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** R10.1. Writing a team down, from the heading or from the empty screen. */
export function AddTeam({ church }: { church: string }) {
  return (
    <TeamPanel
      church={church}
      title={t("serving.addTeam")}
      trigger={
        <Button>
          <Plus /> {t("serving.addTeam")}
        </Button>
      }
    />
  );
}
