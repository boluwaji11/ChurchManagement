"use client";

import * as React from "react";
import {
  Badge, Card, cn, Dialog, DialogTrigger, DialogContent,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { GatheringRow } from "./calendar";

/**
 * R7.1, HRT-70. The month as a calendar.
 *
 * A list says what is scheduled. A grid says which week is missing, which is
 * the question somebody opens this page with in March when the attendance
 * figures look wrong. Every service is a chip, and a chip opens the same
 * actions the list row has.
 */
const readable = (iso: string, locale: string | undefined) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long",
  });

export function MonthGrid({
  month,
  rows,
  today,
  actions,
  onCreate,
}: {
  /** "2026-09". */
  month: string;
  rows: GatheringRow[];
  /** The church's own today, as ISO. Marks the cell when the month holds it. */
  today: string;
  actions: (row: GatheringRow) => React.ReactNode;
  /** Pressing an empty part of a day. Null when this church may not add one. */
  onCreate: ((occursOn: string) => void) | null;
}) {
  const [locale, setLocale] = React.useState<string | undefined>(undefined);
  React.useEffect(() => setLocale(navigator.language), []);

  const [year, monthIndex] = React.useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [y!, m! - 1] as const;
  }, [month]);

  const weekdays = React.useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // Sunday 4 January 1970, so the week starts where the grid starts.
    return Array.from({ length: 7 }, (_, i) => format.format(new Date(1970, 0, 4 + i)));
  }, [locale]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, GatheringRow[]>();
    for (const row of rows) {
      const list = map.get(row.occursOn) ?? [];
      list.push(row);
      map.set(row.occursOn, list);
    }
    return map;
  }, [rows]);

  const lead = new Date(year, monthIndex, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, monthIndex, 1 - lead + i);
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      day: d.getDate(),
      outside: d.getMonth() !== monthIndex,
    };
  });

  // A sixth row only when the month reaches into it.
  const weeks = cells.slice(0, cells.slice(35).some((c) => !c.outside) ? 42 : 35);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b border-line bg-sunken">
        {weekdays.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-label text-fg-muted">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.map((cell) => (
          <div
            key={cell.iso}
            className={cn(
              "relative min-h-24 border-b border-r border-line p-1.5 last:border-r-0",
              cell.outside && "bg-sunken/40",
            )}
          >
            {/* The day itself is the button. A church looking at an empty
                Wednesday and wanting a service there should be able to press
                the Wednesday. The chips sit above it and take their own
                presses.

                Today and after. A day that has been and gone is not somewhere
                to plan, and a church correcting its history does that through
                the dialog, deliberately. */}
            {onCreate && cell.iso >= today ? (
              <button
                type="button"
                aria-label={t("services.addOn", { date: readable(cell.iso, locale) })}
                onClick={() => onCreate(cell.iso)}
                className="absolute inset-0 transition-colors duration-instant hover:bg-sunken/60"
              />
            ) : null}

            <div className="pointer-events-none relative">
              <div
                className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-caption",
                  cell.outside ? "text-fg-subtle" : "text-fg-muted",
                  cell.iso === today && "bg-primary text-primary-fg",
                )}
              >
                {cell.day}
              </div>
              <div className="pointer-events-auto flex flex-col gap-1">
                {(byDay.get(cell.iso) ?? []).map((row) => (
                  <Chip key={row.id} row={row} actions={actions} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Chip({
  row,
  actions,
}: {
  row: GatheringRow;
  actions: (row: GatheringRow) => React.ReactNode;
}) {
  const cancelled = row.status === "cancelled";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full truncate rounded-md px-1.5 py-1 text-left text-caption",
            "transition-[filter] duration-instant ease-out hover:brightness-95",
            cancelled
              ? "bg-sunken text-fg-subtle line-through"
              : row.past
                ? "bg-success-soft text-success-text"
                : "bg-primary-soft text-primary",
          )}
        >
          {row.readableTime} {row.name}
        </button>
      </DialogTrigger>
      <DialogContent
        title={t("services.countTitle", { name: row.name, date: row.readableDate })}
        closeLabel={t("common.close")}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={cancelled ? "warning" : row.past ? "success" : "neutral"}>
              {cancelled
                ? t("services.status.cancelled")
                : row.past
                  ? t("services.status.held")
                  : t("services.status.upcoming")}
            </Badge>
            <span className="text-[length:var(--d-text-body)] text-fg-muted">{row.readableTime}</span>
            {row.total !== null ? (
              <span className="text-[length:var(--d-text-body)] text-fg">{row.total}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1">{actions(row)}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
