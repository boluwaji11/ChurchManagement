"use client";

import * as React from "react";
import { Badge, Button, Card, EmptyState } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { claim } from "./actions";
import { Desk, type DeskRoom, type DeskService } from "./desk";

const REMEMBERED = "hearth_station";

export interface StationOption {
  id: string;
  name: string;
  mode: string;
  printer: string;
  rooms: DeskRoom[];
  services: DeskService[];
}

/**
 * R8.2. The device's own choice, kept on the device.
 *
 * Local storage rather than a cookie or a column, because this is a fact about
 * the tablet on the desk and nothing about the person signed in on it. Two
 * devices signed in as the same volunteer are two stations.
 */
export function StationPicker({
  church,
  stations,
}: {
  church: string;
  stations: StationOption[];
}) {
  const [chosen, setChosen] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(REMEMBERED);
    } catch {
      // A browser with storage blocked chooses every time, which still works.
    }
    setChosen(saved && stations.some((s) => s.id === saved) ? saved : null);
    setReady(true);
  }, [stations]);

  const remember = (id: string | null) => {
    try {
      if (id) window.localStorage.setItem(REMEMBERED, id);
      else window.localStorage.removeItem(REMEMBERED);
    } catch {
      // Nothing to do. The choice holds for this visit.
    }
    setChosen(id);
  };

  const choose = (id: string) => {
    startTransition(async () => {
      const result = await claim(id, church);
      if (result.name) remember(id);
      else remember(null);
    });
  };

  if (!ready) return null;

  if (stations.length === 0) {
    return <EmptyState title={t("checkin.none.title")} body={t("checkin.none.body")} />;
  }

  const station = stations.find((s) => s.id === chosen);

  if (station) {
    return (
      <div className="flex flex-col gap-6">
        <Desk
          church={church}
          stationId={station.id}
          rooms={station.rooms}
          services={station.services}
        />

        {/* Which device this is, kept out of the way. A volunteer checking a
            family in is not thinking about it, and it is only ever touched when
            a tablet is swapped. */}
        <div className="flex flex-wrap items-center gap-2 text-caption text-fg-subtle">
          <span>{station.name}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => remember(null)}
            className="underline underline-offset-2 hover:text-fg"
          >
            {t("checkin.change")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <h2 className="text-title text-fg">{t("checkin.choose")}</h2>
      {stations.map((option) => (
        <Card key={option.id} className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[length:var(--d-text-body)] text-fg">{option.name}</span>
            <Badge tone="neutral">{t(`stations.mode.${option.mode}` as never)}</Badge>
          </div>
          <Button disabled={pending} onClick={() => choose(option.id)}>
            {t("checkin.useThis")}
          </Button>
        </Card>
      ))}
    </div>
  );
}
