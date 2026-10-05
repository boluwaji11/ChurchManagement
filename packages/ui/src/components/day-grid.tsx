"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

/** A date as YYYY-MM-DD, built from local parts rather than from UTC. */
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const todayIso = () => {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
};

export interface DayGridLabels {
  previousMonth: string;
  nextMonth: string;
}

/**
 * A month of days, any number of them chosen.
 *
 * The DatePicker answers "which day", so it takes one and closes. This answers
 * "which days", which is a different question: somebody marking the weekends
 * they are away is picking four or five and wants to see them together while
 * they do it. So the grid stays open, every day toggles, and the caller holds
 * the set.
 *
 * Days before `from` cannot be chosen, because the question is always about
 * what is still to come.
 */
export function DayGrid({
  value,
  onChange,
  from,
  labels,
  locale,
  className,
}: {
  /** The days chosen, as YYYY-MM-DD. */
  value: string[];
  onChange: (value: string[]) => void;
  /** The earliest day that can be chosen. Defaults to today. */
  from?: string;
  labels: DayGridLabels;
  locale?: string;
  className?: string;
}) {
  const floor = from ?? todayIso();
  const start = value[0] ?? floor;
  const [y0, m0] = start.split("-").map(Number);
  const [cursor, setCursor] = React.useState({ y: y0 ?? 2026, m: (m0 ?? 1) - 1 });

  const chosen = React.useMemo(() => new Set(value), [value]);
  const today = todayIso();

  // Six weeks from the Sunday on or before the first, which is every month.
  const first = new Date(cursor.y, cursor.m, 1);
  const lead = first.getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const at = new Date(cursor.y, cursor.m, 1 - lead + i);
    return {
      iso: iso(at.getFullYear(), at.getMonth(), at.getDate()),
      day: at.getDate(),
      month: at.getMonth(),
    };
  });

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 7 + i).toLocaleDateString(locale, { weekday: "narrow" }));

  const step = (by: number) =>
    setCursor((was) => {
      const at = new Date(was.y, was.m + by, 1);
      return { y: at.getFullYear(), m: at.getMonth() };
    });

  const toggle = (day: string) => {
    const next = new Set(chosen);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange([...next].sort());
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={labels.previousMonth}
          onClick={() => step(-1)}
          className="grid size-8 cursor-pointer place-items-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="text-[length:var(--d-text-body)] font-medium text-fg">
          {first.toLocaleDateString(locale, { month: "long", year: "numeric" })}
        </span>

        <button
          type="button"
          aria-label={labels.nextMonth}
          onClick={() => step(1)}
          className="grid size-8 cursor-pointer place-items-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {weekdays.map((one, i) => (
          <span key={i} className="py-1 text-center text-caption text-fg-subtle" aria-hidden>
            {one}
          </span>
        ))}
      </div>

      <div role="grid" className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const on = chosen.has(cell.iso);
          const outside = cell.month !== cursor.m;
          const blocked = cell.iso < floor;
          return (
            <button
              key={cell.iso}
              type="button"
              role="gridcell"
              aria-pressed={on}
              aria-disabled={blocked || undefined}
              disabled={blocked}
              onClick={() => toggle(cell.iso)}
              className={cn(
                "flex h-9 cursor-pointer items-center justify-center rounded-md",
                "text-[length:var(--d-text-body)] transition-colors duration-instant",
                on
                  ? "bg-primary font-semibold text-primary-fg"
                  : blocked
                    ? "cursor-not-allowed text-fg-subtle opacity-40"
                    : outside
                      ? "text-fg-subtle hover:bg-sunken"
                      : "text-fg hover:bg-sunken",
                cell.iso === today && !on && "ring-1 ring-primary/50",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
