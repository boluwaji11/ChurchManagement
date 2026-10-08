"use client";

import * as React from "react";
import { t } from "@connectapp/i18n";

/**
 * R24.6. Columns a reader can set the width of, the way a word processor does.
 *
 * A fund called "Benevolence and hardship" and one called "General" want
 * different amounts of room, and which one matters is the reader's business
 * rather than ours. Dragging the line between two headings takes room from
 * one and gives it to the other, so the table's total width never changes
 * and it can never be pushed off the side of the screen.
 *
 * The table itself stays exactly as its screen wrote it, on the server. This
 * measures what the browser laid out, pins those widths, and draws the
 * handles over the heading row, so a screen gets this by wrapping its table
 * rather than by being rebuilt around a hook.
 *
 * The widths are kept in the browser and stay kept. Somebody who has set a
 * table up the way they read it should find it that way next week, so this
 * outlives the tab rather than being set again every visit. It never leaves
 * the machine it was set on.
 */

/** Nothing is ever dragged narrower than this. */
const FLOOR = 56;

export function ResizableTable({
  id,
  children,
  className,
}: {
  /** Where the widths are remembered. Unique to this table. */
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const host = React.useRef<HTMLDivElement>(null);
  const [widths, setWidths] = React.useState<number[] | null>(null);
  const [headHeight, setHeadHeight] = React.useState(0);

  const tableOf = () => host.current?.querySelector("table") ?? null;

  /*
   * What the browser made of the screen's own classes, taken once.
   *
   * Measuring rather than being told means the widths have one source, the
   * markup, and a column added to a table never needs a number changed here
   * as well. A set remembered from this sitting wins, unless the table has
   * since gained or lost a column, in which case it is thrown out rather
   * than stretched to fit and misaligning every row.
   */
  React.useLayoutEffect(() => {
    const table = tableOf();
    const heads = table?.querySelectorAll<HTMLTableCellElement>("thead th");
    if (!table || !heads || heads.length === 0) return;

    const measured = [...heads].map((th) => th.getBoundingClientRect().width);

    let held: number[] | null = null;
    try {
      const raw = window.localStorage.getItem(`cols:${id}`);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (
        Array.isArray(parsed)
        && parsed.length === measured.length
        && parsed.every((one) => typeof one === "number" && one >= FLOOR)
      ) {
        held = parsed as number[];
      }
    } catch {
      // Private windows and blocked site data both throw. The measurement stands.
    }

    setWidths(held ?? measured);
    setHeadHeight(table.tHead?.getBoundingClientRect().height ?? 0);
  }, [id]);

  /** Pins them, so the browser stops deciding and the handles mean something. */
  React.useLayoutEffect(() => {
    const table = tableOf();
    if (!table || !widths) return;

    table.style.tableLayout = "fixed";
    table.style.minWidth = "0px";
    table.style.width = `${widths.reduce((a, b) => a + b, 0)}px`;

    const heads = table.querySelectorAll<HTMLTableCellElement>("thead th");
    heads.forEach((th, at) => {
      const width = widths[at];
      if (width !== undefined) th.style.width = `${width}px`;
    });
  }, [widths]);

  /**
   * Moves the line between a column and the one after it.
   *
   * Whatever one gains the other loses, which is what keeps the total where
   * it was. A drag that would take either below the floor stops at the floor
   * rather than refusing.
   */
  const nudge = React.useCallback((at: number, by: number) => {
    setWidths((was) => {
      if (!was) return was;
      const mine = was[at];
      const theirs = was[at + 1];
      if (mine === undefined || theirs === undefined) return was;

      const room = Math.max(Math.min(by, theirs - FLOOR), FLOOR - mine);
      if (room === 0) return was;

      const next = [...was];
      next[at] = mine + room;
      next[at + 1] = theirs - room;

      try {
        window.localStorage.setItem(`cols:${id}`, JSON.stringify(next));
      } catch {
        // Nothing to do. The widths hold for this page either way.
      }
      return next;
    });
  }, [id]);

  /** Where each line sits, measured from the left edge of the table. */
  const edges: number[] = [];
  if (widths) {
    let along = 0;
    for (const width of widths.slice(0, -1)) {
      along += width;
      edges.push(along);
    }
  }

  return (
    <div ref={host} className={`w-full overflow-x-auto ${className ?? ""}`}>
      <div className="relative w-max min-w-full">
        {children}

        {/* Drawn over the heading row, inside the scroller, so they travel
            with the columns when a narrow screen scrolls sideways. */}
        {headHeight > 0
          ? edges.map((along, at) => (
              <Handle
                key={at}
                at={at}
                along={along}
                height={headHeight}
                nudge={nudge}
              />
            ))
          : null}
      </div>
    </div>
  );
}

/**
 * The line between two headings, and the thing you take hold of.
 *
 * Wider than it looks: a one pixel target is a target nobody with a tremor
 * can hit, so the rule is a pixel and the grab area is eleven. Arrow keys
 * move it too, because a table that can only be arranged with a mouse is a
 * table some people cannot arrange.
 */
function Handle({
  at,
  along,
  height,
  nudge,
}: {
  at: number;
  along: number;
  height: number;
  nudge: (at: number, by: number) => void;
}) {
  const from = React.useRef(0);

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={t("table.resize")}
      tabIndex={0}
      style={{ left: along - 5.5, height }}
      onPointerDown={(e) => {
        e.preventDefault();
        from.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const by = e.clientX - from.current;
        if (by === 0) return;
        from.current = e.clientX;
        nudge(at, by);
      }}
      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 24 : 8;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          nudge(at, -step);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          nudge(at, step);
        }
      }}
      className="group absolute top-0 z-10 flex w-[11px] cursor-col-resize touch-none justify-center"
    >
      <span className="h-full w-px bg-transparent transition-colors duration-instant group-hover:bg-primary group-focus-visible:bg-primary" />
    </span>
  );
}
