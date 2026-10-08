"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@connectapp/ui";
import { Empty } from "@/components/empty";
import { t } from "@connectapp/i18n";
import { ScheduleGrid, type GridService, type GridTeam, type GridSlot, type GridPosition, type GridVolunteer } from "./grid";

/**
 * R10.3. The schedule, which is the whole of this screen.
 *
 * The teams themselves are written down in Settings: their names, their
 * positions and what each one asks of a volunteer change once a year, and this
 * is what a leader opens on a Tuesday to fill the weekend.
 */
export function ServingViews({
  church,
  heading,
  schedule,
  canManage,
}: {
  church: string;
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
  /** The month and its legend, above the grid. */
  heading: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [busy, startFilling] = React.useTransition();

  const go = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) query.delete(key);
      else query.set(key, value);
    }
    startFilling(() => {
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
    });
  };

  if (!schedule) {
    return (
      <Empty
        icon="calendar"
        title={t("serving.noServices")}
        body={t("serving.noServices.body")}
        action={
          canManage ? (
            <Button asChild>
              <Link href={`/services?church=${church}`}>
                <Plus /> {t("services.add")}
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    /*
     * R24.6. A month for another team is a month fetched from the server, and
     * the picker that asks for it sits inside the grid. The grid itself goes
     * quiet for the round trip, which marks the wait and holds the picker off
     * a second choice until the new month lands.
     */
    <div
      aria-busy={busy}
      className={`flex flex-col gap-7 transition-opacity duration-fast ${
        busy ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {heading}

      <ScheduleGrid
        church={church}
        teams={schedule.teams}
        team={schedule.team}
        positions={schedule.positions}
        services={schedule.services}
        slots={schedule.slots}
        volunteers={schedule.volunteers}
        canManage={canManage}
        onTeam={(slug) => go({ team: slug })}
      />
    </div>
  );
}
