"use client";

import * as React from "react";
import { Printer, UserCheck } from "lucide-react";
import {
  Badge, Banner, Button, Card, EmptyState, HueDot, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { serviceNow } from "@hearth/db/rules";
import type { Board, RoomRosterEntry } from "@hearth/db";
import type { DeskService } from "../desk";
import { board as readBoard } from "./actions";
import { IncidentDialog } from "./incident";

/**
 * R8.17 to R8.19. The screen the person walking the corridor reads.
 *
 * Every room on one screen, with the two numbers that matter on it: how many
 * children are in there, and how many adults are with them. A room that has
 * dropped below two volunteers says so loudly, because that is the failure that
 * happens quietly.
 *
 * It refreshes itself, because a supervisor holding a tablet should not have to
 * remember to pull it down.
 */
const REFRESH_SECONDS = 20;

export function RoomBoard({
  church,
  services,
  now,
  today,
  initial,
  rosters: firstRosters,
}: {
  church: string;
  services: DeskService[];
  now: string;
  /** The church's own date, for a report filed from here. */
  today: string;
  initial: Board | null;
  rosters: Record<string, RoomRosterEntry[]>;
}) {
  const [service, setService] = React.useState(() => serviceNow(services, now));
  const [live, setLive] = React.useState<Board | null>(initial);
  const [rosters, setRosters] = React.useState(firstRosters);
  const [error, setError] = React.useState<string>();
  const [open, setOpen] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!service) return;
    let running = true;

    const pull = async () => {
      const result = await readBoard(service, church);
      if (!running) return;
      setError(result.error);
      if (result.board) setLive(result.board);
      if (result.rosters) setRosters(result.rosters);
    };

    void pull();
    const timer = setInterval(() => void pull(), REFRESH_SECONDS * 1000);
    return () => {
      running = false;
      clearInterval(timer);
    };
  }, [service, church]);

  if (services.length === 0) {
    return <EmptyState title={t("checkin.noService.title")} body={t("checkin.noService.body")} />;
  }

  if (!live || live.rooms.length === 0) {
    return <EmptyState title={t("board.noRooms.title")} body={t("board.noRooms.body")} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Banner tone="danger" title={t("board.title")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {services.length > 1 ? (
          <Select value={service} onValueChange={setService}>
            <SelectTrigger aria-label={t("checkin.service")} className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t("checkin.serviceAt", { name: s.name, time: s.readableTime })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span />
        )}

        <Button variant="secondary" onClick={() => window.print()}>
          <Printer /> {t("board.print")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[length:var(--d-text-body)] text-fg">
        <span className="flex items-center gap-2">
          <UserCheck className="size-5 text-fg-muted" aria-hidden />
          {plural("board.outstanding", live.outstanding)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-1">
        {live.rooms.map((room) => (
          <Card key={room.roomId} className="flex flex-col gap-3 p-0 print:break-inside-avoid">
            {/* The card is the control: tapping a class shows who is in it. */}
            <button
              type="button"
              aria-expanded={open === room.roomId}
              onClick={() => setOpen(open === room.roomId ? null : room.roomId)}
              className="flex w-full flex-col gap-3 rounded-[inherit] p-[var(--d-pad-card)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 text-heading text-fg">
                  <HueDot hue={room.hue as Hue} />
                  {room.name}
                </span>
                <span className="font-mono text-display leading-none text-fg">
                  {room.capacity === null
                    ? room.present
                    : t("board.ofCapacity", { present: room.present, capacity: room.capacity })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {room.over ? (
                  <Badge tone="danger">{t("board.over")}</Badge>
                ) : room.full ? (
                  <Badge tone="warning">{t("checkin.full")}</Badge>
                ) : null}
                {room.collected > 0 ? (
                  <span className="text-caption text-fg-muted">
                    {plural("board.collected", room.collected)}
                  </span>
                ) : null}
              </div>
            </button>

            {/* R8.18. On screen when the class is tapped, and on paper always,
                because the room needs it on the wall and the tablet is in the
                lobby. */}
            <div
              className={
                (open === room.roomId ? "" : "hidden print:block") +
                " px-[var(--d-pad-card)] pb-[var(--d-pad-card)] print:p-0"
              }
            >
              <Roster
                church={church}
                today={today}
                roomId={room.roomId}
                occurrenceId={service}
                entries={rosters[room.roomId] ?? []}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Roster({
  church,
  today,
  roomId,
  occurrenceId,
  entries,
}: {
  church: string;
  today: string;
  roomId: string;
  occurrenceId: string;
  entries: RoomRosterEntry[];
}) {
  if (entries.length === 0) {
    return <span className="text-caption text-fg-muted">{t("board.empty")}</span>;
  }

  return (
    <ul className="flex flex-col">
      {entries.map((entry, i) => (
        <li key={entry.personId}>
          {i > 0 ? <Separator className="my-2" /> : null}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[length:var(--d-text-body)] text-fg">{entry.name}</span>
            <span className="flex items-center gap-2">
              {entry.checkedOutAt ? (
                <span className="text-caption text-fg-muted">{t("board.gone")}</span>
              ) : null}
              {entry.code ? (
                <span className="font-mono text-caption tracking-widest text-fg">{entry.code}</span>
              ) : null}
            </span>
          </div>
          {entry.allergies || entry.medicalNote ? (
            <div className="text-caption text-danger">
              {[entry.allergies, entry.medicalNote].filter(Boolean).join(". ")}
            </div>
          ) : null}

          {/* R8.13. Written in the room, by whoever saw it. */}
          <div className="print:hidden">
            <IncidentDialog
              church={church}
              personId={entry.personId}
              personName={entry.name}
              roomId={roomId}
              occurrenceId={occurrenceId}
              today={today}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
