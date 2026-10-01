"use client";

import * as React from "react";
import { Search, Check, Undo2, UserCheck } from "lucide-react";
import {
  Badge, Banner, Button, Card, EmptyState, Field, HueDot, Input, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { find, checkIn, undo, type FoundHousehold, type FoundPerson } from "./actions";

export interface DeskRoom {
  id: string;
  name: string;
  hue: string;
  capacity: number | null;
}

export interface DeskService {
  id: string;
  name: string;
  startsAt: string;
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
  rooms,
  services,
}: {
  church: string;
  stationId: string;
  rooms: DeskRoom[];
  services: DeskService[];
}) {
  const [service, setService] = React.useState(services[0]?.id ?? "");
  const [query, setQuery] = React.useState("");
  const [households, setHouseholds] = React.useState<FoundHousehold[]>([]);
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
  const [pending, startTransition] = React.useTransition();

  // Typing is the whole interaction, so the search runs as they type and the
  // keystrokes settle before it does.
  React.useEffect(() => {
    if (query.trim().length < 2) {
      setHouseholds([]);
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await find(query, service, church);
        setError(result.error);
        setHouseholds(result.households ?? []);
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [query, service, church]);

  const start = (household: FoundHousehold) => {
    setOpen(household.id);
    setDone([]);
    setPrinting([]);
    setCodes({});
    const rooms: Record<string, string | null> = {};
    const people: Record<string, boolean> = {};
    for (const person of household.people) {
      rooms[person.id] = person.roomId ?? person.suggestedRoomId;
      people[person.id] = !person.checkedIn;
    }
    setChosen(rooms);
    setPicked(people);
  };

  const household = households.find((h) => h.id === open);

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
      const result = await checkIn(service, stationId, entries, church);
      setError(result.error);
      if (result.error) return;
      setCounts(result.counts ?? {});
      setCodes(result.codes ?? {});
      setDone(entries.map((e) => e.personId));

      // The children on this press are the ones whose labels have to come out
      // of the printer before anybody walks away.
      const children = entries.filter((e) => e.child).map((e) => e.personId);
      setPrinting(children);
      if (children.length > 0) {
        window.open(
          `/checkin/labels?church=${church}&service=${service}&people=${children.join(",")}`,
          "hearth-labels",
          "width=520,height=720",
        );
      }

      const refreshed = await find(query, service, church);
      setHouseholds(refreshed.households ?? []);
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
    const waiting = printing;
    setPrinting([]);

    if (printed) {
      // Back to an empty box, because the next family is already at the desk.
      setQuery("");
      setOpen(null);
      setCodes({});
      return;
    }

    startTransition(async () => {
      for (const personId of waiting) await undo(service, personId, church);
      const refreshed = await find(query, service, church);
      setHouseholds(refreshed.households ?? []);
      setDone([]);
    });
  };

  const take = (personId: string) => {
    startTransition(async () => {
      const result = await undo(service, personId, church);
      setError(result.error);
      if (result.error) return;
      setCounts(result.counts ?? {});
      const refreshed = await find(query, service, church);
      setHouseholds(refreshed.households ?? []);
    });
  };

  if (services.length === 0) {
    return <EmptyState title={t("checkin.noService.title")} body={t("checkin.noService.body")} />;
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("checkin.title")}>{error}</Banner> : null}

      {services.length > 1 ? (
        <Select value={service} onValueChange={setService}>
          <SelectTrigger aria-label={t("checkin.service")}><SelectValue /></SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Field label={t("checkin.search")}>
        <div className="flex items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3 shadow-sm">
          <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(null); }}
            autoComplete="off"
            autoFocus
            className="border-0 bg-transparent shadow-none"
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
            <span className="text-heading text-fg">{household.name}</span>
            <Button variant="ghost" onClick={() => setOpen(null)}>{t("action.cancel")}</Button>
          </div>

          <ul className="flex flex-col">
            {household.people.map((person, i) => (
              <li key={person.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <Member
                  person={person}
                  rooms={rooms}
                  counts={counts}
                  roomId={chosen[person.id] ?? null}
                  picked={Boolean(picked[person.id])}
                  justDone={done.includes(person.id)}
                  onRoom={(roomId) => setChosen((c) => ({ ...c, [person.id]: roomId }))}
                  onPick={(on) => setPicked((p) => ({ ...p, [person.id]: on }))}
                  onUndo={() => take(person.id)}
                />
              </li>
            ))}
          </ul>

          <div>
            <Button onClick={send} disabled={pending}>
              <Check /> {t("checkin.check")}
            </Button>
          </div>
        </Card>
      ) : households.length > 0 ? (
        <div className="flex flex-col gap-2">
          {households.map((h) => (
            <Card key={h.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[length:var(--d-text-body)] text-fg">{h.name}</div>
                <div className="truncate text-caption text-fg-muted">
                  {h.people.map((p) => p.name).join(", ")}
                </div>
              </div>
              <Button onClick={() => start(h)}>{t("checkin.open")}</Button>
            </Card>
          ))}
        </div>
      ) : query.trim().length >= 2 && !pending ? (
        <EmptyState title={t("checkin.nobody.title")} body={t("checkin.nobody.body")} />
      ) : null}
    </div>
  );
}

function Member({
  person,
  rooms,
  counts,
  roomId,
  picked,
  justDone,
  onRoom,
  onPick,
  onUndo,
}: {
  person: FoundPerson;
  rooms: DeskRoom[];
  counts: Record<string, number>;
  roomId: string | null;
  picked: boolean;
  justDone: boolean;
  onRoom: (roomId: string | null) => void;
  onPick: (on: boolean) => void;
  onUndo: () => void;
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
        <Button variant="ghost" onClick={onUndo}><Undo2 /> {t("checkin.undo")}</Button>
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
      ) : (
        <span className="text-caption text-fg-muted">{t("checkin.badge")}</span>
      )}
    </div>
  );
}
