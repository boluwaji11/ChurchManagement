"use client";

import * as React from "react";
import { Printer, UserCheck } from "lucide-react";
import {
  CriticalBanner,
  Badge, Banner, Button, Card, Dialog, DialogContent, EmptyState, HueDot, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { serviceNow } from "@hearth/db/rules";
import type { Board, RoomRosterEntry } from "@hearth/db";
import type { DeskService } from "../desk";
import { board as readBoard } from "./actions";
import { IncidentDialog } from "./incident";
import { Checkout } from "../checkout";

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
  // The board is tagged with the service it was read for, so a switch never
  // shows one service's numbers under another's name.
  const [data, setData] = React.useState<{
    service: string;
    board: Board;
    rosters: Record<string, RoomRosterEntry[]>;
  } | null>(initial ? { service: "", board: initial, rosters: firstRosters } : null);
  const [error, setError] = React.useState<string>();
  const [open, setOpen] = React.useState<string | null>(null);

  const pullNow = React.useCallback(async () => {
    if (!service) return;
    const result = await readBoard(service, church);
    setError(result.error);
    if (result.board) {
      setData({ service, board: result.board, rosters: result.rosters ?? {} });
    }
  }, [service, church]);

  React.useEffect(() => {
    if (!service) return;

    setOpen(null);
    void pullNow();
    const timer = setInterval(() => void pullNow(), REFRESH_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [service, pullNow]);

  if (services.length === 0) {
    return <EmptyState title={t("checkin.noService.title")} body={t("checkin.noService.body")} />;
  }

  // Only the board that belongs to the service on screen.
  const live = data?.service === service ? data.board : null;
  const rosters = data?.service === service ? data.rosters : {};
  const opened = live?.rooms.find((r) => r.roomId === open);

  return (
    <div className="flex flex-col gap-5">
      {error ? <Banner tone="danger" title={t("board.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>

      {live ? (
        <div className="flex flex-wrap items-center gap-4 text-[length:var(--d-text-body)] text-fg">
          <span className="flex items-center gap-2">
            <UserCheck className="size-5 text-fg-muted" aria-hidden />
            {plural("board.outstanding", live.outstanding)}
          </span>
        </div>
      ) : null}

      {live && live.rooms.length === 0 ? (
        <EmptyState title={t("board.noRooms.title")} body={t("board.noRooms.body")} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(live?.rooms ?? []).map((room) => (
          <Card key={room.roomId} className="p-0">
            {/* The card is the control: tapping a class shows who is in it, in
                front of everything, because a class of thirty pushed every
                other class off the screen. */}
            <button
              type="button"
              onClick={() => setOpen(room.roomId)}
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
          </Card>
        ))}
      </div>

      {/* R8.18. The roster, in front of the board, with the way to put it on
          paper beside it. The room needs it on the wall and the tablet is in
          the lobby. */}
      <Dialog open={opened !== undefined} onOpenChange={(on) => setOpen(on ? open : null)}>
        <DialogContent
          title={opened?.name ?? ""}
          closeLabel={t("common.close")}
          className="max-w-xl"
        >
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            <Roster
              church={church}
              today={today}
              roomId={opened?.roomId ?? ""}
              occurrenceId={service}
              entries={opened ? (rosters[opened.roomId] ?? []) : []}
              onChanged={() => void pullNow()}
            />
          </div>

          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() =>
                window.open(
                  `/checkin/rooms/print?church=${church}&service=${service}&room=${opened?.roomId ?? ""}`,
                  "hearth-roster",
                  "width=720,height=900",
                )
              }
            >
              <Printer /> {t("board.print")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Roster({
  church,
  today,
  roomId,
  occurrenceId,
  entries,
  onChanged,
}: {
  church: string;
  today: string;
  roomId: string;
  occurrenceId: string;
  entries: RoomRosterEntry[];
  onChanged: () => void;
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
          {/* R8.10. The same fact the station treats as critical was the
              smallest text on this screen, in the lowest-contrast red we have. */}
          {entry.allergies || entry.medicalNote ? (
            <CriticalBanner
              heading={t("checkin.allergies")}
              items={[entry.allergies, entry.medicalNote].filter(Boolean) as string[]}
              className="mt-2"
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-1 print:hidden">
            {/* R8.7. A child is usually collected at the door of their own
                class, so the way to do it is on the class roster. */}
            {entry.checkedOutAt === null ? (
              <Checkout
                church={church}
                visitId={entry.visitId}
                childId={entry.personId}
                childName={entry.name}
                onDone={onChanged}
              />
            ) : null}

            {/* R8.13. Written in the room, by whoever saw it. */}
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
