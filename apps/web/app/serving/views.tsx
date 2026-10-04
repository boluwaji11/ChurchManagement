"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { ScheduleGrid, type GridService, type GridTeam, type GridSlot, type GridPosition, type GridVolunteer } from "./grid";

/**
 * R10.1, R10.3. The two ways into serving: the rota, and the teams that fill it.
 *
 * The schedule leads, because a leader opens this screen on a Tuesday to fill
 * the weekend rather than to edit a team.
 */
export function ServingViews({
  church,
  view,
  heading,
  schedule,
  canManage,
  teams: teamsView,
}: {
  church: string;
  view: "schedule" | "teams";
  /** Null when the church has no team or nothing scheduled to fill. */
  schedule: {
    teams: GridTeam[];
    team: GridTeam;
    positions: GridPosition[];
    services: GridService[];
    slots: GridSlot[];
    volunteers: GridVolunteer[];
  } | null;
  /** Whether this person may change a team. */
  canManage: boolean;
  teams: React.ReactNode;
  /** The heading and its summary, which sit under the two tabs. */
  heading: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) query.delete(key);
      else query.set(key, value);
    }
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  return (
    <>
      <div className="flex items-center gap-1 self-start rounded-md bg-sunken p-[3px]">
        {(["schedule", "teams"] as const).map((one) => (
          <button
            key={one}
            type="button"
            onClick={() => go({ view: one === "schedule" ? undefined : one })}
            aria-pressed={view === one}
            className={cn(
              "h-8 rounded-sm px-3.5 text-[13px] font-medium",
              view === one ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
            )}
          >
            {t(`serving.view.${one}` as never)}
          </button>
        ))}
      </div>

      {heading}

      {view === "teams" ? (
        teamsView
      ) : schedule ? (
        <ScheduleGrid
          church={church}
          teams={schedule.teams}
          team={schedule.team}
          positions={schedule.positions}
          services={schedule.services}
          slots={schedule.slots}
          volunteers={schedule.volunteers}
          canManage={canManage}
          onTeam={(id) => go({ team: id })}
        />
      ) : (
        <p className="text-fg-muted">{t("serving.noServices")}</p>
      )}
    </>
  );
}
