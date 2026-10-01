"use client";

import * as React from "react";
import { Search, Check, Undo2, UserCheck } from "lucide-react";
import {
  Badge, Banner, Button, Card, EmptyState, Field, HueDot, Input, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { serviceNow } from "@hearth/db/rules";
import { checkIn, undo, type FoundMatch, type FoundPerson } from "./actions";
import { useFind } from "./use-find";
import { useStation } from "./offline/station";
import { Connection, useStationWorker } from "./offline/connection";
import { keepLabels } from "./offline/store";
import { Allergies, warnings } from "./allergies";
import { Checkout, type OfflineCheckout } from "./checkout";

export interface DeskRoom {
  id: string;
  name: string;
  hue: string;
  capacity: number | null;
}

export interface DeskService {
  id: string;
  name: string;
  /** 24-hour HH:MM, for working out which one is happening. */
  startsAt: string;
  /** The same time as a person reads it. */
  readableTime: string;
}

/**
 * R8.3 to R8.5. The desk.
 *
 * Type what the parent says, take the family that comes back, send each child
 * to a room and press once. The room is filled in from the child's date of
 * birth and a volunteer can change it, because the child who is small for their
 * age and sits with their sibling is not a data error.
 */
export function Desk({
  church,
  stationId,
  printer,
  rooms,
  services,
  now,
}: {
  church: string;
  stationId: string;
  /** R8.25. The station's label stock, which the labels window prints to. */
  printer: string;
  rooms: DeskRoom[];
  services: DeskService[];
  now: string;
}) {
  const [service, setService] = React.useState(() => serviceNow(services, now));
  const [query, setQuery] = React.useState("");

  useStationWorker();
  const station = useStation(stationId, service, church);
  const offline = React.useMemo(
    () => ({
      ready: station.snapshot !== null,
      online: station.state.online,
      search: station.searchLocal,
    }),
    [station.snapshot, station.state.online, station.searchLocal],
  );
  const { matches, error: searchError, searching, again } = useFind(query, service, church, offline);
  const [open, setOpen] = React.useState<string | null>(null);
  const [chosen, setChosen] = React.useState<Record<string, string | null>>({});
  const [picked, setPicked] = React.useState<Record<string, boolean>>({});
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [error, setError] = React.useState<string>();
  const [done, setDone] = React.useState<string[]>([]);
  // Who is waiting on a label. Until the volunteer says the labels are in the
  // parent's hand, the check-in is not finished. (R8.6)
  const [printing, setPrinting] = React.useState<string[]>([]);
  const [codes, setCodes] = React.useState<Record<string, string>>({});
  // R8.10. The flow does not finish until somebody has said they read it.
  const [seen, setSeen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const start = (match: FoundMatch) => {
    setOpen(match.id);
    setDone([]);
    setPrinting([]);
    setCodes({});
    const rooms: Record<string, string | null> = {};
    const people: Record<string, boolean> = {};
    for (const person of match.people) {
      rooms[person.id] = person.roomId ?? person.suggestedRoomId;
      people[person.id] = !person.checkedIn;
    }
    setChosen(rooms);
    setPicked(people);
    setSeen(false);
  };

  const household = matches.find((m) => m.id === open);
  /** Who this press would check in. Nobody means the press is not offered. */
  const waiting = household
    ? household.people.filter((p) => picked[p.id] && !p.checkedIn)
    : [];
  const needsReading = warnings(waiting).length > 0;

  const send = () => {
    if (!household) return;
    const entries = household.people
      .filter((p) => picked[p.id] && !p.checkedIn)
      .map((p) => ({
        personId: p.id,
        roomId: p.isChild ? (chosen[p.id] ?? null) : null,
        child: p.isChild,
      }));
    if (entries.length === 0) return;

    startTransition(async () => {
      const children = entries.filter((e) => e.child).map((e) => e.personId);
      const wearing = entries.map((e) => e.personId);

      // R8.21. With no network the station does the whole thing itself: it
      // takes codes off the block it was given, writes the check-in to its own
      // log, and prints from what it wrote.
      if (!station.state.online) {
        let given: Record<string, string>;
        try {
          given = await station.checkInLocally(entries);
        } catch {
          setError(t("station.error.codes"));
          return;
        }

        setCodes(given);
        setDone(entries.map((e) => e.personId));
        setPrinting(children);

        if (wearing.length > 0) {
          await keepLabels(
            wearing.map((personId) => {
              const person = household.people.find((p) => p.id === personId);
              const room = rooms.find((r) => r.id === chosen[personId]);
              return {
                personId,
                childName: `${person?.name ?? ""} ${person?.lastName ?? ""}`.trim(),
                roomName: room?.name ?? null,
                roomHue: room?.hue ?? null,
                serviceName: services.find((s) => s.id === service)?.name ?? "",
                churchName: station.snapshot?.churchName ?? "",
                code: given[personId] ?? null,
                allergy: person?.allergies ?? null,
              };
            }),
          );
          window.open(`/checkin/labels?local=1&printer=${printer}`, "hearth-labels", "width=520,height=720");
        }
        return;
      }

      const result = await checkIn(service, stationId, entries, church);
      setError(result.error);
      if (result.error) return;
      setCounts(result.counts ?? {});
      setCodes(result.codes ?? {});
      setDone(entries.map((e) => e.personId));

      // The children on this press are the ones whose labels have to come out
      // of the printer before anybody walks away.
      setPrinting(children);
      if (wearing.length > 0) {
        window.open(
          `/checkin/labels?church=${church}&service=${service}&printer=${printer}&people=${wearing.join(",")}`,
          "hearth-labels",
          "width=520,height=720",
        );
      }

      await again();
    });
  };

  /**
   * R8.6. A label that did not print takes the check-in with it.
   *
   * A child marked present with no label in a parent's hand is a child nobody
   * can prove belongs to the person who comes to collect them, so the answer to
   * a printer that jammed is to put the check-in back rather than carry on.
   */
  const settle = (printed: boolean) => {
    const unsettled = printing;
    setPrinting([]);

    if (printed) {
      // Back to an empty box, because the next family is already at the desk.
      setQuery("");
      setOpen(null);
      setCodes({});
      return;
    }

    startTransition(async () => {
      for (const personId of unsettled) await undo(service, personId, church);
      await again();
      setDone([]);
    });
  };

  const take = (personId: string) => {
    startTransition(async () => {
      if (!station.state.online) {
        await station.undoLocally(personId);
        return;
      }
      const result = await undo(service, personId, church);
      setError(result.error);
      if (result.error) return;
      setCounts(result.counts ?? {});
      await again();
    });
  };

  if (services.length === 0) {
    return <EmptyState title={t("checkin.noService.title")} body={t("checkin.noService.body")} />;
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || searching}>
      <Connection
        state={station.state}
        onSend={() => void station.reconcile()}
        onDismiss={station.dismissConflicts}
      />

      {error ?? searchError ? (
        <Banner tone="danger" title={t("checkin.title")}>{error ?? searchError}</Banner>
      ) : null}

      {services.length > 1 ? (
        <Select value={service} onValueChange={setService}>
          <SelectTrigger aria-label={t("checkin.service")}><SelectValue /></SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {t("checkin.serviceAt", { name: s.name, time: s.readableTime })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Field label={t("checkin.search")}>
        <div className="flex items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3 shadow-sm transition-colors has-[input:focus]:border-fg">
          <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(null); }}
            autoComplete="off"
            autoFocus
            className="border-0 bg-transparent shadow-none outline-none focus-visible:outline-none"
          />
        </div>
      </Field>

      {household && printing.length > 0 ? (
        /* R8.6. Done, and what the parent is holding. The code is here as well
           as on the label, because a printer that smudged is not a reason for
           anybody to guess. */
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Check className="size-6 text-success-text" aria-hidden />
            <span className="text-heading text-fg">{t("checkin.done")}</span>
          </div>

          <ul className="flex flex-col gap-2">
            {printing.map((personId) => {
              const person = household.people.find((p) => p.id === personId);
              const room = rooms.find((r) => r.id === chosen[personId]);
              const code = codes[personId];
              return (
                <li key={personId} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[length:var(--d-text-body)] text-fg">
                    {room ? <HueDot hue={room.hue as Hue} /> : null}
                    {person?.name}
                    {room ? <span className="text-fg-muted">{room.name}</span> : null}
                  </span>
                  {code ? (
                    <span className="font-mono text-title tracking-widest text-fg">{code}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => settle(true)}>{t("checkin.printed")}</Button>
            <Button variant="ghost" disabled={pending} onClick={() => settle(false)}>
              {t("checkin.notPrinted")}
            </Button>
          </div>
        </Card>
      ) : household ? (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-heading text-fg">{household.household ?? household.name}</span>
            <Button variant="ghost" onClick={() => setOpen(null)}>{t("action.cancel")}</Button>
          </div>

          <ul className="flex flex-col">
            {household.people.map((person, i) => (
              <li key={person.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <Member
                  church={church}
                  person={person}
                  rooms={rooms}
                  counts={counts}
                  roomId={chosen[person.id] ?? null}
                  picked={Boolean(picked[person.id])}
                  justDone={done.includes(person.id)}
                  onRoom={(roomId) => setChosen((c) => ({ ...c, [person.id]: roomId }))}
                  onPick={(on) => setPicked((p) => ({ ...p, [person.id]: on }))}
                  onUndo={() => take(person.id)}
                  offline={{
                    online: station.state.online,
                    pickupFor: station.pickupFor,
                    release: station.releaseLocally,
                  }}
                />
              </li>
            ))}
          </ul>

          {/* R8.10, R24.14. Full width, above the button, and the button does
              not work until it has been read. A volunteer finishing a check-in
              without having seen this is the failure the requirement exists to
              stop. */}
          <Allergies
            people={household.people.filter((p) => picked[p.id] && !p.checkedIn)}
            seen={seen}
            onSeen={() => setSeen(true)}
          />

          {/* Nobody left to check in is nothing to press. */}
          {waiting.length > 0 ? (
            <div>
              <Button
                onClick={send}
                disabled={pending || (needsReading && !seen)}
              >
                <Check /> {t("checkin.check")}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : matches.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => start(m)}
                className="flex w-full min-w-0 flex-col items-start gap-0.5 rounded-[var(--d-radius-control)] border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <span className="truncate text-[length:var(--d-text-body)] text-fg">{m.name}</span>
                {m.household ? (
                  <span className="truncate text-caption text-fg-muted">{m.household}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 && !searching ? (
        <EmptyState title={t("checkin.nobody.title")} body={t("checkin.nobody.body")} />
      ) : null}
    </div>
  );
}

function Member({
  church,
  person,
  rooms,
  counts,
  roomId,
  picked,
  justDone,
  onRoom,
  onPick,
  onUndo,
  offline,
}: {
  church: string;
  person: FoundPerson;
  rooms: DeskRoom[];
  counts: Record<string, number>;
  roomId: string | null;
  picked: boolean;
  justDone: boolean;
  onRoom: (roomId: string | null) => void;
  onPick: (on: boolean) => void;
  onUndo: () => void;
  offline: OfflineCheckout;
}) {
  const room = rooms.find((r) => r.id === roomId);
  const inRoom = roomId ? (counts[roomId] ?? 0) : 0;
  const full = room?.capacity !== null && room?.capacity !== undefined && inRoom >= room.capacity;

  if (person.checkedIn) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <UserCheck className="size-5 text-success-text" aria-hidden />
          <span className="text-[length:var(--d-text-body)] text-fg">{person.name}</span>
          {person.roomId ? (
            <Badge tone="success">
              {rooms.find((r) => r.id === person.roomId)?.name ?? t("checkin.checkedIn")}
            </Badge>
          ) : (
            <Badge tone="success">{t("checkin.checkedIn")}</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {person.visitId ? (
            <Checkout
              church={church}
              visitId={person.visitId}
              childId={person.id}
              childName={person.name}
              offline={offline}
            />
          ) : null}
          <Button variant="ghost" onClick={onUndo}><Undo2 /> {t("checkin.undo")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={picked}
          onChange={(e) => onPick(e.target.checked)}
          className="size-5 accent-[var(--primary)]"
        />
        <span className="text-[length:var(--d-text-body)] text-fg">{person.name}</span>
        {justDone ? <Badge tone="success">{t("checkin.checkedIn")}</Badge> : null}
      </label>

      {/* Only children are checked into a class. An adult is here, counted on
          the attendance, and wearing a name badge. */}
      {person.isChild ? (
        <div className="flex items-center gap-2">
          {full ? <Badge tone="warning">{t("checkin.full")}</Badge> : null}
          <Select value={roomId ?? ""} onValueChange={(value) => onRoom(value || null)}>
            <SelectTrigger aria-label={t("checkin.room")} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="flex items-center gap-2">
                    <HueDot hue={r.hue as Hue} />
                    {r.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
