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

  /*
   * R10.4. A run of days is drawn across rather than tapped one at a time.
   *
   * Somebody away for a fortnight is answering one question, and fourteen
   * presses is the kind of thing that stops people answering it. Pressing and
   * dragging marks everything the pointer passes over, and holding Shift
   * reaches the same range from the keyboard. Whether the run is being added or
   * taken away is decided by the day it started on, so dragging back over a run
   * clears it.
   */
  const anchor = React.useRef<string | null>(null);
  const mode = React.useRef<"add" | "remove">("add");
  const dragged = React.useRef(false);
  const [drawing, setDrawing] = React.useState(false);

  const daysBetween = (a: string, b: string): string[] => {
    const [from, to] = a <= b ? [a, b] : [b, a];
    const out: string[] = [];
    const [y, m, d] = from.split("-").map(Number) as [number, number, number];
    const at = new Date(y, m - 1, d);
    for (let guard = 0; guard < 400; guard += 1) {
      const day = iso(at.getFullYear(), at.getMonth(), at.getDate());
      if (day > to) break;
      if (day >= floor) out.push(day);
      at.setDate(at.getDate() + 1);
    }
    return out;
  };

  const run = (to: string) => {
    const at = anchor.current;
    if (!at) return;
    const next = new Set(chosen);
    for (const day of daysBetween(at, to)) {
      if (mode.current === "add") next.add(day);
      else next.delete(day);
    }
    onChange([...next].sort());
  };

  const begin = (day: string, extend: boolean) => {
    if (extend && anchor.current) {
      run(day);
      return;
    }
    anchor.current = day;
    mode.current = chosen.has(day) ? "remove" : "add";
    run(day);
  };

  React.useEffect(() => {
    if (!drawing) return;
    const stop = () => setDrawing(false);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [drawing]);

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

      {/* Dragging across days is a selection gesture, so the browser must not
          read it as scrolling the page or selecting text. */}
      <div role="grid" className="grid touch-none grid-cols-7 gap-0.5 select-none">
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
              onPointerDown={(event) => {
                // The pointer owns this press. The click that follows it is the
                // same gesture arriving twice.
                dragged.current = true;
                setDrawing(true);
                begin(cell.iso, event.shiftKey);
              }}
              onPointerEnter={() => {
                if (drawing) run(cell.iso);
              }}
              onClick={(event) => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                // The keyboard, which sends a click and no pointer.
                if (event.shiftKey) begin(cell.iso, true);
                else {
                  anchor.current = cell.iso;
                  mode.current = chosen.has(cell.iso) ? "remove" : "add";
                  toggle(cell.iso);
                }
              }}
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
