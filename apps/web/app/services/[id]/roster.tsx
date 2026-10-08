"use client";

import * as React from "react";
import { Search, Check } from "lucide-react";
import { Badge, Banner, Button, Input, cn } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { markPresent, markManyPresent } from "./actions";

export interface RosterPerson {
  memberId: string;
  name: string;
  surname: string;
  present: boolean;
  /** 1 if this is their first ever visit, 2 their second, 0 if not marked. */
  visit: number;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * R7.3. Ticking a roster.
 *
 * The criterion is 120 members in under three minutes on a tablet with no page
 * reloads, so the tick is drawn the moment it is pressed and the write goes
 * behind it. A press that fails puts the tick back and says so: showing it
 * saved when it did not is worse than being slow.
 *
 * Rows are large, because this is done standing up, by somebody holding a
 * tablet in one hand.
 */
export function Roster({
  church,
  occurrenceId,
  members,
  canEdit,
}: {
  church: string;
  occurrenceId: string;
  members: RosterPerson[];
  canEdit: boolean;
}) {
  const [present, setPresentIds] = React.useState<Set<string>>(
    () => new Set(members.filter((p) => p.present).map((p) => p.memberId)),
  );
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [bulk, startBulk] = React.useTransition();
  // Which of the two was pressed, so the spinner lands on that one.
  const [bulkOn, setBulkOn] = React.useState<boolean | null>(null);

  // Only the members still marked count, so unticking somebody entered by
  // mistake takes them out of the number as well as off the list.
  const newcomers = React.useMemo(
    () => members.filter((p) => p.visit === 1 && present.has(p.memberId)).length,
    [members, present],
  );

  const shown = React.useMemo(() => {
    const q = fold(query.trim());
    if (!q) return members;
    return members.filter((p) => fold(p.name).includes(q) || fold(p.surname).includes(q));
  }, [members, query]);

  const toggle = (memberId: string) => {
    const next = !present.has(memberId);

    // Drawn first. A tablet that waits for a round trip before showing the tick
    // is a tablet somebody presses twice.
    setPresentIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(memberId);
      else copy.delete(memberId);
      return copy;
    });
    setError(undefined);

    const data = new FormData();
    data.set("church", church);
    data.set("occurrenceId", occurrenceId);
    data.set("memberId", memberId);
    data.set("present", next ? "1" : "0");

    void markPresent(data).then((result) => {
      if (!result.error) return;
      setError(result.error);
      setPresentIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.delete(memberId);
        else copy.add(memberId);
        return copy;
      });
    });
  };

  const markShown = (next: boolean) => {
    const ids = shown.map((p) => p.memberId);
    const before = new Set(present);

    setPresentIds((prev) => {
      const copy = new Set(prev);
      for (const id of ids) {
        if (next) copy.add(id);
        else copy.delete(id);
      }
      return copy;
    });
    setError(undefined);

    const data = new FormData();
    data.set("church", church);
    data.set("occurrenceId", occurrenceId);
    data.set("present", next ? "1" : "0");
    for (const id of ids) data.append("memberId", id);

    setBulkOn(next);
    startBulk(async () => {
      const result = await markManyPresent(data);
      setBulkOn(null);
      if (!result.error) return;
      setError(result.error);
      setPresentIds(before);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {error ? <Banner tone="danger" title={t("roster.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("roster.search")}
            aria-label={t("roster.search")}
            className="pl-9"
          />
        </div>
        <span className="text-label text-fg-muted">{plural("roster.present", present.size)}</span>
        {newcomers > 0 ? (
          <Badge tone="accent">{plural("roster.newCount", newcomers)}</Badge>
        ) : null}
      </div>

      {canEdit && shown.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={bulk}
            loading={bulk && bulkOn === true}
            onClick={() => markShown(true)}
          >
            {t("roster.markAll")}
          </Button>
          <Button
            variant="ghost"
            disabled={bulk}
            loading={bulk && bulkOn === false}
            onClick={() => markShown(false)}
          >
            {t("roster.clearAll")}
          </Button>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("roster.none")}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {shown.map((person) => {
            const on = present.has(person.memberId);
            return (
              <li key={person.memberId}>
                <button
                  type="button"
                  disabled={!canEdit}
                  aria-pressed={on}
                  onClick={() => toggle(person.memberId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left",
                    "min-h-[var(--d-tap)] text-[length:var(--d-text-body)]",
                    "transition-colors duration-instant ease-out",
                    on
                      ? "border-primary bg-primary-soft text-fg"
                      : "border-line bg-surface text-fg hover:bg-sunken",
                    !canEdit && "pointer-events-none opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border",
                      on ? "border-primary bg-primary text-primary-fg" : "border-line-strong",
                    )}
                  >
                    {on ? <Check className="size-4" aria-hidden /> : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    {person.name}
                    {on && person.visit === 1 ? (
                      <Badge tone="accent">{t("roster.firstTime")}</Badge>
                    ) : null}
                    {on && person.visit === 2 ? (
                      <Badge tone="info">{t("roster.secondTime")}</Badge>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
