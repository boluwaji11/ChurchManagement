"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";
import { Button, Card, EmptyState, Field, HueDot, Input, type Hue } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { serviceNow } from "@hearth/db";
import { find, checkIn, type FoundHousehold } from "./actions";
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
  rooms,
  services,
  now,
}: {
  church: string;
  stationId: string;
  rooms: DeskRoom[];
  services: DeskService[];
  now: string;
}) {
  const [service, setService] = React.useState(() => serviceNow(services, now));
  const [query, setQuery] = React.useState("");
  const [households, setHouseholds] = React.useState<FoundHousehold[]>([]);
  const [open, setOpen] = React.useState<string | null>(null);
  const [chosen, setChosen] = React.useState<Record<string, string | null>>({});
  const [picked, setPicked] = React.useState<Record<string, boolean>>({});
  const [codes, setCodes] = React.useState<Record<string, string>>({});
  const [finished, setFinished] = React.useState<string[]>([]);
  const [seen, setSeen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const reset = React.useCallback(() => {
    setQuery("");
    setHouseholds([]);
    setOpen(null);
    setChosen({});
    setPicked({});
    setCodes({});
    setFinished([]);
    setSeen(false);
    setError(undefined);
  }, []);

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

  // Back to the start on its own, so a family who walked away does not leave
  // their children's names on a screen in the lobby.
  React.useEffect(() => {
    if (finished.length === 0) return;
    const timer = setTimeout(reset, CLEAR_AFTER_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [finished, reset]);

  const household = households.find((h) => h.id === open);

  const start = (match: FoundHousehold) => {
    setOpen(match.id);
    const roomFor: Record<string, string | null> = {};
    const who: Record<string, boolean> = {};
    for (const person of match.people) {
      roomFor[person.id] = person.roomId ?? person.suggestedRoomId;
      who[person.id] = !person.checkedIn;
    }
    setChosen(roomFor);
    setPicked(who);
    setSeen(false);
  };

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
      setCodes(result.codes ?? {});
      setFinished(entries.map((e) => e.personId));

      const children = entries.filter((e) => e.child).map((e) => e.personId);
      if (children.length > 0) {
        window.open(
          `/checkin/labels?church=${church}&service=${service}&people=${children.join(",")}`,
          "hearth-labels",
          "width=520,height=720",
        );
      }
    });
  };

  if (services.length === 0) {
    return (
      <div data-density="station">
        <EmptyState title={t("checkin.noService.title")} body={t("checkin.noService.body")} />
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
            {finished.map((personId) => {
              const person = household.people.find((p) => p.id === personId);
              const room = rooms.find((r) => r.id === chosen[personId]);
              return (
                <li key={personId} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-title text-fg">
                    {room ? <HueDot hue={room.hue as Hue} /> : null}
                    {person?.name}
                    {room ? <span className="text-fg-muted">{room.name}</span> : null}
                  </span>
                  {codes[personId] ? (
                    <span className="font-mono text-display tracking-widest text-fg">
                      {codes[personId]}
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
    <div data-density="station" className="flex flex-col gap-5" aria-busy={pending}>
      {error ? (
        <Card className="border-danger text-fg">{error}</Card>
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
          <span className="text-display text-fg">{household.name}</span>

          <ul className="flex flex-col gap-4">
            {household.people.map((person) => (
              <li key={person.id} className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(picked[person.id]) && !person.checkedIn}
                    disabled={person.checkedIn}
                    onChange={(e) =>
                      setPicked((p) => ({ ...p, [person.id]: e.target.checked }))
                    }
                    className="size-7 accent-[var(--primary)]"
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
            people={household.people.filter((p) => picked[p.id] && !p.checkedIn)}
            seen={seen}
            onSeen={() => setSeen(true)}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={send}
              disabled={
                pending ||
                (warnings(household.people.filter((p) => picked[p.id] && !p.checkedIn)).length > 0 &&
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
            <div className="flex items-center gap-3 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-4 shadow-sm">
              <Search className="size-[var(--d-icon)] shrink-0 text-fg-muted" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                autoFocus
                className="border-0 bg-transparent shadow-none"
              />
            </div>
          </Field>

          {households.map((h) => (
            <Card key={h.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-title text-fg">{h.name}</div>
                <div className="truncate text-[length:var(--d-text-body)] text-fg-muted">
                  {h.people.map((p) => p.name).join(", ")}
                </div>
              </div>
              <Button onClick={() => start(h)}>{t("checkin.thisIsUs")}</Button>
            </Card>
          ))}

          {query.trim().length >= 2 && households.length === 0 && !pending ? (
            <EmptyState title={t("checkin.nobody.title")} body={t("checkin.nobody.body")} />
          ) : null}
        </>
      )}
    </div>
  );
}
