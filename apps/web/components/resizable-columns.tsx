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

/** Under this, the screen is a phone and the handles come off. */
const DESK_FROM = 640;

/** A screen too narrow to arrange a table on. Named, so the test can read it. */
const isNarrow = (room: number) => room !== 0 && DESK_FROM > room;

/** Remembered widths that do not fit the screen they have been opened on. */
const tooWide = (held: number[], measured: number[], room: number) =>
  room !== 0 && sum(held) > room && room + 1 >= sum(measured);

const sum = (set: number[]) => set.reduce((a, b) => a + b, 0);

/**
 * R24.6. A set of widths stretched to the room it has been opened in.
 *
 * The widths are kept as pixels, so a table arranged on a 1280px window and
 * opened on a 1440px one holds the old total and leaves a band of empty card
 * down the right of every row. Where the set is narrower than the space it
 * has, each column grows by its own share of what is going spare, so the
 * proportions the reader arranged hold and the table still reaches the edge.
 *
 * A set wider than the room is left alone: that table is meant to scroll.
 */
/**
 * R24.6. A table nobody has arranged fits the card it is in.
 *
 * What the browser laid out can be wider than the room, from a long fund name
 * or a column minimum. Pinning that measurement is what left two tables on
 * the giving screen scrolling sideways before anybody had touched them. The
 * measurement is scaled down to the room instead, and sideways scrolling is
 * left to a reader who has widened a column themselves.
 */
const squeezed = (set: number[], room: number) => {
  const total = sum(set);
  const last = set.length - 1;
  if (room === 0 || total <= room || last < 0) return set;

  const cut = set.map((one) => Math.max(FLOOR, Math.floor((one * room) / total)));
  cut[last] = Math.max(FLOOR, room - sum(cut.slice(0, last)));
  return cut;
};

const fitted = (set: number[], room: number) => {
  const total = sum(set);
  const last = set.length - 1;
  if (room === 0 || total === 0 || last < 0 || total >= room) return set;

  const grown = set.map((one) => Math.floor((one * room) / total));
  // Whatever the rounding dropped goes on the last column, so the total is exact.
  grown[last] = room - sum(grown.slice(0, last));
  return grown;
};

export function ResizableTable({
  id,
  anchor,
  children,
  className,
}: {
  /** Where the widths are remembered. Unique to this table. */
  id: string;
  /** R24.6. Named, so a pager under it can bring the reader back to it. */
  anchor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const host = React.useRef<HTMLDivElement>(null);
  const [widths, setWidths] = React.useState<number[] | null>(null);
  const [headHeight, setHeadHeight] = React.useState(0);
  /*
   * R24.6. No handles on a phone. The grab area is eleven pixels wide, which
   * is a target nobody hits with a thumb, and it sits over the heading text it
   * would be dragging. A reader on a phone scrolls the table sideways instead,
   * and finds their own widths again at a desk.
   */
  const [narrow, setNarrow] = React.useState(false);

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
    const read = () => {
    const table = tableOf();
    const heads = table?.querySelectorAll<HTMLTableCellElement>("thead th");
    if (!table || !heads || heads.length === 0) return;

    const measured = [...heads].map((th) => th.getBoundingClientRect().width);

    /*
     * R24.6. Nothing is pinned from a table nobody laid out.
     *
     * A screen that draws its rows as cards on a phone and as a table at a
     * desk has the table there and hidden, and a hidden table measures zero
     * across. Pinning that gives the table a width of nothing, so when the
     * window widens the rows are drawn one pixel across and the screen reads
     * as broken. Left alone until there is something to measure.
     */
    if (measured.some((one) => one === 0)) return;

    let held: number[] | null = null;
    try {
      const raw = window.localStorage.getItem(`cols:v2:${id}`);
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

    /*
     * R24.6. A set measured at a desk does not open on a phone.
     *
     * One table, one remembered set, every screen the reader opens it on. A
     * set that came off a 1440px window pins eleven hundred pixels of table
     * into a 358px scroller, and the reader arrives at a first column with
     * nothing in it and ten screens of sideways scrolling behind it. Where
     * the remembered widths are wider than the screen in front of them, and
     * what this screen laid out does fit, the layout wins. The set stays in
     * the browser, so the desk finds it again.
     */
    const room = host.current?.clientWidth ?? 0;
    if (held && tooWide(held, measured, room)) held = null;

    /* A set the reader arranged is theirs, wide or not. A set nobody has
       arranged is made to fit. */
    setWidths(held ? fitted(held, room) : squeezed(measured, room));
    setHeadHeight(table.tHead?.getBoundingClientRect().height ?? 0);
    setNarrow(isNarrow(room));
    };

    read();
    /*
     * A phone turned on its side, or a table that was hidden at this width
     * and is not at the next one, gets measured again.
     */
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, [id]);

  /** Pins them, so the browser stops deciding and the handles mean something. */
  React.useLayoutEffect(() => {
    const table = tableOf();
    if (!table || !widths) return;

    table.style.tableLayout = "fixed";
    table.style.minWidth = "0px";
    table.style.width = `${sum(widths)}px`;

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
        window.localStorage.setItem(`cols:v2:${id}`, JSON.stringify(next));
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
    <div id={anchor} ref={host} className={`w-full overflow-x-auto ${className ?? ""}`}>
      <div className="relative w-max min-w-full">
        {children}

        {/* Drawn over the heading row, inside the scroller, so they travel
            with the columns when a narrow screen scrolls sideways. */}
        {headHeight > 0 && !narrow
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
