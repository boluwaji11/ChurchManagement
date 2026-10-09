"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck, Undo2 } from "lucide-react";
import { Banner, Button, LIFT } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { TeamPanel, type PositionDraft, type MemberDraft } from "../../schedule/team-panel";
import { archiveTeam } from "../../schedule/actions";
import { WriteTo } from "@/components/inbox/write-to";

export interface TeamItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  members: MemberDraft[];
  positions: PositionDraft[];
  needsChecks: boolean;
  archived: boolean;
}

/** R10.1. The one place a team is written down, renamed or put away. */
export function TeamList({
  church,
  teams,
  putAway = false,
  canMessage = false,
}: {
  church: string;
  teams: TeamItem[];
  /** R10.1. The teams that have been put away, rather than the ones in use. */
  putAway?: boolean;
  /** R16.9. Whether this reader answers for the church. */
  canMessage?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

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

      {teams.length === 0 ? (
        <Empty
          icon="serving"
          title={putAway ? t("serving.archived.none") : t("settings.teams.none.title")}
          body={putAway ? undefined : t("settings.teams.none.body")}
          action={
            putAway
              ? undefined
              : <AddTeam church={church} taken={teams.map((one) => one.name)} />
          }
        />
      ) : putAway ? (
        <ul className="flex flex-col rounded-[14px] border border-line bg-surface px-5 py-1">
          {teams.map((team) => (
            <li
              key={team.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-sunken py-2.5 last:border-0"
            >
              <span className="text-[length:var(--d-text-body)] text-fg-muted">{team.name}</span>
              <Button
                variant="ghost"
                disabled={pending}
                className="h-8 min-h-0 px-2.5 text-[13px]"
                onClick={() => setArchived(team.id, false)}
              >
                <Undo2 className="size-4" aria-hidden /> {t("serving.restore")}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr))]">
          {teams.map((team) => (
            <li key={team.id} className="relative h-full">
              {/* R9.7, R16.9. The team's own thread, lifted above the tile so
                  the press reaches the conversation rather than the panel. */}
              {canMessage ? (
                <span className="absolute right-2 top-2 z-10">
                  <WriteTo at={`team/${team.slug}`} name={team.name} />
                </span>
              ) : null}

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
                    {/* Room kept on the right for the action above it, so a
                        long name is cut short rather than running under it. */}
                    <span className="min-w-0 truncate pr-9 font-semibold text-fg">{team.name}</span>

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
    </div>
  );
}

/** R10.1. Writing a team down, from the heading or from the empty screen. */
export function AddTeam({ church, taken = [] }: { church: string; taken?: string[] }) {
  return (
    <TeamPanel
      church={church}
      taken={taken}
      title={t("serving.addTeam")}
      trigger={
        <Button>
          <Plus /> {t("serving.addTeam")}
        </Button>
      }
    />
  );
}
