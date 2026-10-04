"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Empty } from "@/components/empty";
import { claim } from "./actions";
import { Desk, type DeskRoom, type DeskService } from "./desk";
import { Kiosk } from "./kiosk";

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
  now,
  canManage,
}: {
  church: string;
  stations: StationOption[];
  /** The church's own clock, as HH:MM. */
  now: string;
  /** Whether the person reading "an administrator creates these" is one. */
  canManage: boolean;
  /**
   * The church's navigation, shown while somebody is choosing a station and
   * gone once one is claimed. A parent at a kiosk has no business with it, and
   * a volunteer with a queue has no time for it.
   */
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

  /*
   * R8.x, design system section 8. One task, full screen. Once a station is
   * claimed the screen leaves the app behind: a family driving a kiosk
   * themselves must not be handed the church's navigation, and a volunteer at
   * the desk does not need it either while there is a queue. The way back is
   * the station's own control.
   *
   * Always light and always station density, because the room it stands in is
   * the one the church has, and 56px targets at 20px text is the point.
   */
  const page = (content: React.ReactNode, chrome: boolean) =>
    chrome ? (
      <div className="mx-auto w-full max-w-3xl">{content}</div>
    ) : (
      <div
        data-theme="light"
        data-density="station"
        className="fixed inset-0 z-50 overflow-auto bg-canvas px-4 py-8 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">{content}</div>
      </div>
    );

  if (stations.length === 0) {
    return page(
      <Empty
          icon="station"
        title={t("checkin.none.title")}
        body={t("checkin.none.body")}
        action={
          canManage ? (
            <Button asChild>
              <Link href={`/settings/stations?church=${church}`}>{t("stations.add")}</Link>
            </Button>
          ) : undefined
        }
      />,
      true,
    );
  }

  const station = stations.find((s) => s.id === chosen);

  if (station) {
    return page(
      <div className="flex flex-col gap-6" data-station="claimed">
        {/* A family driving the screen themselves sees a different one. The
            flow is the same; what a parent has no business touching is not
            there. */}
        {station.mode === "kiosk" ? (
          <Kiosk
            church={church}
            stationId={station.id}
            printer={station.printer}
            rooms={station.rooms}
            services={station.services}
            now={now}
          />
        ) : (
          <Desk
            church={church}
            stationId={station.id}
            printer={station.printer}
            rooms={station.rooms}
            services={station.services}
            now={now}
          />
        )}

        {/* Which device this is, kept out of the way. A volunteer checking a
            family in is not thinking about it, and it is only ever touched when
            a tablet is swapped. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-[length:var(--d-text-body)] text-fg-muted">{station.name}</span>
          <Button variant="ghost" disabled={pending} onClick={() => remember(null)}>
            {t("checkin.change")}
          </Button>
        </div>
      </div>,
      false,
    );
  }

  return page(
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
    </div>,
    true,
  );
}
