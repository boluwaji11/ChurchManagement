"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";
import {
  Banner,
  Checkbox, Button, Card, Field, HueDot, Input, type Hue } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { openLabels } from "./open-labels";
import { serviceNow } from "@connectapp/db/rules";
import { checkIn, type FoundMatch } from "./actions";
import { useFind } from "./use-find";
import { useStation } from "./offline/station";
import { Connection, useStationWorker } from "./offline/connection";
import { keepLabels } from "./offline/store";
import { Allergies, warnings } from "./allergies";
import type { DeskRoom, DeskService } from "./desk";

/**
 * R8.1, R24.14. The screen a family drives itself.
 *
 * Station density, so every target is a thumb and every line is readable at
 * arm's length on a stand. The same flow as the desk with everything a parent
 * has no business touching taken away: no undo, no other household on screen
 * once they have chosen theirs, and no way into the rest of the church's
 * records.
 *
 * It returns to an empty search on its own, because the next family is already
 * waiting and nobody wants to find the last family's children on the screen.
 */
const CLEAR_AFTER_SECONDS = 20;

export function Kiosk({
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
  const { matches, error: searchError, searching } = useFind(query, service, church, offline);
  const [open, setOpen] = React.useState<string | null>(null);
  const [chosen, setChosen] = React.useState<Record<string, string | null>>({});
  const [picked, setPicked] = React.useState<Record<string, boolean>>({});
  const [codes, setCodes] = React.useState<Record<string, string>>({});
  const [finished, setFinished] = React.useState<string[]>([]);
  const [seen, setSeen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [blocked, setBlocked] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const reset = React.useCallback(() => {
    setQuery("");
    setOpen(null);
    setChosen({});
    setPicked({});
    setCodes({});
    setFinished([]);
    setSeen(false);
    setError(undefined);
  }, []);

  // Back to the start on its own, so a family who walked away does not leave
  // their children's names on a screen in the lobby.
  React.useEffect(() => {
    if (finished.length === 0) return;
    const timer = setTimeout(reset, CLEAR_AFTER_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [finished, reset]);

  const household = matches.find((m) => m.id === open);

  const start = (match: FoundMatch) => {
    setOpen(match.id);
    const roomFor: Record<string, string | null> = {};
    const who: Record<string, boolean> = {};
    for (const person of match.members) {
      roomFor[person.id] = person.roomId ?? person.suggestedRoomId;
      who[person.id] = !person.checkedIn;
    }
    setChosen(roomFor);
    setPicked(who);
    setSeen(false);
  };

  const send = () => {
    if (!household) return;
    const entries = household.members
      .filter((p) => picked[p.id] && !p.checkedIn)
      .map((p) => ({
        memberId: p.id,
        roomId: p.isChild ? (chosen[p.id] ?? null) : null,
        child: p.isChild,
      }));
    if (entries.length === 0) return;

    startTransition(async () => {
      const wearing = entries.map((e) => e.memberId);

      // R8.21. A family checking themselves in with the wifi down gets the same
      // screen, the same labels and the same codes.
      if (!station.state.online) {
        let given: Record<string, string>;
        try {
          given = await station.checkInLocally(entries);
        } catch {
          setError(t("station.error.codes"));
          return;
        }
        setCodes(given);
        setFinished(entries.map((e) => e.memberId));

        if (wearing.length > 0) {
          await keepLabels(
            wearing.map((memberId) => {
              const person = household.members.find((p) => p.id === memberId);
              const room = rooms.find((r) => r.id === chosen[memberId]);
              return {
                memberId,
                childName: `${person?.name ?? ""} ${person?.lastName ?? ""}`.trim(),
                roomName: room?.name ?? null,
                roomHue: room?.hue ?? null,
                serviceName: services.find((s) => s.id === service)?.name ?? "",
                churchName: station.snapshot?.churchName ?? "",
                code: given[memberId] ?? null,
                allergy: person?.allergies ?? null,
                // R8.12. A parent at a kiosk is not asked about a bag: it is
                // one more decision in the queue, and the volunteer at the desk
                // is the one who prints it when a bag turns up.
                bag: false,
              };
            }),
          );
          if (!openLabels(`/checkin/labels/print?local=1&printer=${printer}`)) {
            setBlocked(`/checkin/labels/print?local=1&printer=${printer}`);
          }
        }
        return;
      }

      const result = await checkIn(service, stationId, entries, church);
      setError(result.error);
      if (result.error) return;
      setCodes(result.codes ?? {});
      setFinished(entries.map((e) => e.memberId));

      if (wearing.length > 0) {
        const href =
          `/checkin/labels/print?church=${church}&service=${service}&printer=${printer}` +
          `&members=${wearing.join(",")}`;
        if (!openLabels(href)) setBlocked(href);
      }
    });
  };

  if (services.length === 0) {
    return (
      <div data-density="station">
        <Empty icon="calendar" title={t("checkin.noService.title")} body={t("checkin.noService.body")} />
      </div>
    );
  }

  if (finished.length > 0 && household) {
    return (
      <div data-density="station" className="flex flex-col gap-6">
        <Card className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Check className="size-8 text-success-text" aria-hidden />
            <span className="text-display text-fg">{t("checkin.done")}</span>
          </div>

          <ul className="flex flex-col gap-3">
            {finished.map((memberId) => {
              const person = household.members.find((p) => p.id === memberId);
              const room = rooms.find((r) => r.id === chosen[memberId]);
              return (
                <li key={memberId} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-title text-fg">
                    {room ? <HueDot hue={room.hue as Hue} /> : null}
                    {person?.name}
                    {room ? <span className="text-fg-muted">{room.name}</span> : null}
                  </span>
                  {codes[memberId] ? (
                    <span className="font-mono text-display tracking-widest text-fg">
                      {codes[memberId]}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <Button full onClick={reset}>{t("checkin.next")}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div data-density="station" className="flex flex-col gap-5" aria-busy={pending || searching}>
      {blocked ? (
        <Banner tone="warning" title={t("labels.blocked")}>
          <a href={blocked} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            {t("labels.open")}
          </a>
        </Banner>
      ) : null}


      <Connection
        state={station.state}
        onSend={() => void station.reconcile()}
        onDismiss={station.dismissConflicts}
      />

      {error ?? searchError ? (
        <Card className="border-danger text-fg">{error ?? searchError}</Card>
      ) : null}

      {services.length > 1 && !household ? (
        <div className="flex flex-wrap gap-3">
          {services.map((s) => (
            <Button
              key={s.id}
              variant={s.id === service ? "primary" : "secondary"}
              onClick={() => setService(s.id)}
            >
              {t("checkin.serviceAt", { name: s.name, time: s.readableTime })}
            </Button>
          ))}
        </div>
      ) : null}

      {household ? (
        <Card className="flex flex-col gap-5">
          <span className="text-display text-fg">{household.household ?? household.name}</span>

          <ul className="flex flex-col gap-4">
            {household.members.map((person) => (
              <li key={person.id} className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={Boolean(picked[person.id]) && !person.checkedIn}
                    disabled={person.checkedIn}
                    onCheckedChange={(on) =>
                      setPicked((p) => ({ ...p, [person.id]: on === true }))
                    }
                  />
                  <span className="text-title text-fg">{person.name}</span>
                  {person.checkedIn ? (
                    <span className="text-[length:var(--d-text-body)] text-success-text">
                      {t("checkin.checkedIn")}
                    </span>
                  ) : null}
                </label>

                {/* Rooms as buttons rather than a dropdown. A parent on a stand
                    reads four names at once faster than they open a menu. */}
                {person.isChild && !person.checkedIn ? (
                  <div className="flex flex-wrap gap-2 pl-10">
                    {rooms.map((room) => (
                      <Button
                        key={room.id}
                        variant={chosen[person.id] === room.id ? "primary" : "secondary"}
                        onClick={() => setChosen((c) => ({ ...c, [person.id]: room.id }))}
                      >
                        <HueDot hue={room.hue as Hue} />
                        {room.name}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {/* R8.10, R24.14. A parent checking their own child in reads this
              before the labels print, the same as a volunteer does. */}
          <Allergies
            members={household.members.filter((p) => picked[p.id] && !p.checkedIn)}
            seen={seen}
            onSeen={() => setSeen(true)}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={send}
              disabled={
                pending ||
                (warnings(household.members.filter((p) => picked[p.id] && !p.checkedIn)).length > 0 &&
                  !seen)
              }
            >
              <Check /> {t("checkin.check")}
            </Button>
            <Button variant="ghost" onClick={reset}>{t("action.cancel")}</Button>
          </div>
        </Card>
      ) : (
        <>
          <Field label={t("checkin.search")}>
            <div className="flex items-center gap-3 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-4 shadow-sm transition-colors has-[input:focus-visible]:border-fg has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--ring)]">
              <Search className="size-[var(--d-icon)] shrink-0 text-fg-muted" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                autoFocus
                className="border-0 bg-transparent shadow-none outline-none focus-visible:outline-none"
              />
            </div>
          </Field>

          {matches.map((m) => (
            <Card key={m.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-title text-fg">{m.name}</div>
                {m.household ? (
                  <div className="truncate text-[length:var(--d-text-body)] text-fg-muted">
                    {m.household}
                  </div>
                ) : null}
              </div>
              <Button onClick={() => start(m)}>{t("checkin.thisIsUs")}</Button>
            </Card>
          ))}

          {query.trim().length >= 2 && matches.length === 0 && !searching ? (
            <Empty icon="calendar" title={t("checkin.nobody.title")} body={t("checkin.nobody.body")} />
          ) : null}
        </>
      )}
    </div>
  );
}
