"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, ShieldCheck, Undo2 } from "lucide-react";
import { Badge, Banner, Button, IconButton, LIFT } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { TeamDialog, type PositionDraft } from "../../serving/team-dialog";
import { archiveTeam } from "../../serving/actions";

export interface TeamItem {
  id: string;
  /** R24.6. Its readable address, so the card opens the team itself. */
  slug: string;
  name: string;
  description: string | null;
  members: number;
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
          action={<AddTeam church={church} />}
        />
      ) : (
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {live.map((team) => (
            <li key={team.id}>
              {/* R24.6, R10.3. The card opens the team itself, where its roster
                  and its schedule are. The pencil is lifted above the stretched
                  link so the panel stays one press away. */}
              <section
                className={`relative flex h-full cursor-pointer flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 ${LIFT}`}
              >
                <div className="flex w-full items-center gap-2.5">
                  <h3 className="min-w-0 flex-1 truncate font-semibold text-fg">
                    <Link
                      href={`/serving/${team.slug}?church=${church}`}
                      className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
                    >
                      {team.name}
                    </Link>
                  </h3>

                  <TeamDialog
                    church={church}
                    team={{
                      id: team.id,
                      name: team.name,
                      description: team.description,
                    }}
                    positions={team.positions}
                    title={t("serving.editTeam")}
                    trigger={
                      <IconButton
                        label={t("serving.editTeam")}
                        variant="ghost"
                        className="relative -my-1"
                      >
                        <Pencil />
                      </IconButton>
                    }
                  />
                </div>

                {team.positions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {team.positions.map(({ id, name }) => (
                      <span
                        key={id}
                        className="flex h-[26px] items-center rounded-full bg-sunken px-2.5 text-[12px] font-medium text-fg"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}

                {team.needsChecks ? (
                  <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                    <ShieldCheck className="size-4" aria-hidden />
                    {t("serving.needsChecks")}
                  </span>
                ) : null}

                <span className="mt-auto w-full border-t border-sunken pt-3 text-[13px] text-fg-muted">
                  {[
                    plural("serving.volunteerCount", team.members),
                    plural("serving.positionCount", team.positions.length),
                  ].join(" · ")}
                </span>
              </section>
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
    <TeamDialog
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
