"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, RotateCcw, Pencil } from "lucide-react";
import { Banner, Button, IconButton, EmptyState, Badge } from "@hearth/ui";
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
  /** The positions by name, which is what the card actually shows. */
  positionNames: string[];
  needsChecks: boolean;
  archived: boolean;
  /** R10.3. Slots still to fill across the month on screen. */
  open: number;
}

/**
 * R10.1. Every team the church runs.
 *
 * A card each, carrying what somebody opening this screen is asking: what the
 * team is made of, how many people it has, and how much of this month is still
 * to fill.
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

  if (teams.length === 0) return <EmptyState title={t("serving.empty")} />;

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      <ul className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {teams.map((team) => (
          <li key={team.id}>
            <section className="flex h-full flex-col gap-3.5 rounded-lg border border-line bg-surface p-4.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="size-3 shrink-0 rounded-[4px]"
                  style={{ background: `var(--hue-${team.hue}-500)` }}
                />
                <h3 className="min-w-0 flex-1 truncate font-display text-[21px] leading-[26px] text-fg">
                  {team.name}
                </h3>
                {team.archived ? (
                  <Badge tone="neutral">{t("serving.archived")}</Badge>
                ) : team.open > 0 ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium"
                    style={{
                      background: "var(--hue-amber-tint)",
                      color: "var(--hue-amber-key)",
                    }}
                  >
                    {t("serving.openCount", { count: team.open })}
                  </span>
                ) : null}
              </div>

              {/* R10.2. What the team is made of, which is the thing a church
                  recognises its own team by. */}
              {team.positionNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {team.positionNames.map((name) => (
                    <span
                      key={name}
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

              <div className="mt-auto flex items-center gap-3 border-t border-sunken pt-3">
                <span className="flex-1 text-[13px] text-fg-muted">
                  {[
                    plural("serving.volunteerCount", team.members),
                    plural("serving.positionCount", team.positions),
                  ].join(" · ")}
                </span>

                <Button variant="secondary" className="min-h-[34px] px-3 text-[13px]" asChild>
                  <Link href={`/serving?church=${church}&team=${team.id}`}>
                    {t("serving.openSchedule")}
                  </Link>
                </Button>
              </div>

              {canManage ? (
                <div className="flex flex-wrap items-center gap-1">
                  <TeamDialog
                    church={church}
                    team={team}
                    title={t("serving.editTeam")}
                    trigger={<IconButton label={t("action.edit")}><Pencil /></IconButton>}
                  />
                  {team.archived ? (
                    <IconButton
                      label={t("serving.restore")}
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setArchived(team.id, false)}
                    >
                      <RotateCcw />
                    </IconButton>
                  ) : (
                    <ArchiveTeamDialog
                      name={team.name}
                      pending={pending}
                      onConfirm={() => setArchived(team.id, true)}
                    />
                  )}
                </div>
              ) : null}
            </section>
          </li>
        ))}
      </ul>
    </div>
  );
}
