import * as React from "react";
import type { LegendSpot } from "@connectapp/db/rules";

/**
 * R18.x. The parts every chart shares: a scale, round numbers up the side, a
 * key, and a tooltip that says what a shape stands for.
 *
 * No "use client" anywhere in here. The hover is drawn by CSS, so a chart works
 * on the server-rendered saved report and inside the builder's preview without
 * two code paths, and it keeps working for somebody whose JavaScript has not
 * arrived yet.
 */

/**
 * The piece of a visual somebody pressed, so the Format pane can open on it.
 *
 * Pressing the key to format the key is how every tool of this kind works, and
 * it beats hunting down a pane for the section that matches what the eye is
 * already on.
 */
export type Part = "colour" | "labels" | "legend" | "axis";

/** A count a church reads at a glance: 1,234, then 12.3k past ten thousand. */
export function readable(value: number): string {
  if (Math.abs(value) >= 10000) {
    const thousands = value / 1000;
    return `${thousands.toFixed(thousands >= 100 ? 0 : 1)}k`;
  }
  return value.toLocaleString();
}

/**
 * Round numbers to rule the chart at, from zero to a little above the tallest
 * bar. 1, 2, 2.5 and 5 times a power of ten, which is what people count in.
 */
export function ticks(top: number, wanted = 4): number[] {
  if (top <= 0) return [0, 1];
  const rough = top / wanted;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((one) => one * power).find((one) => one >= rough) ?? power * 10;
  const out: number[] = [];
  for (let at = 0; at <= top + step / 2; at += step) out.push(Math.round(at * 100) / 100);
  return out.length > 1 ? out : [0, step];
}

/** What the tallest gridline sits at, so bars are measured against a round number. */
export const ceiling = (top: number): number => {
  const marks = ticks(top);
  return marks[marks.length - 1] ?? 1;
};

/** A part of a visual that opens its own section of the Format pane. */
export function Tappable({
  part,
  onPart,
  className = "",
  children,
}: {
  part: Part;
  onPart?: (part: Part) => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (!onPart) return <div className={className}>{children}</div>;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onPart(part); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onPart(part); }
      }}
      className={`cursor-pointer rounded-md outline-none ring-primary ring-offset-2 ring-offset-surface hover:bg-sunken/70 focus-visible:ring-2 ${className}`}
    >
      {children}
    </div>
  );
}

/** The key naming the series, in the place the report put it. */
export function Key({
  items,
  at,
  onPart,
}: {
  items: { name: string; hue: string }[];
  at: LegendSpot;
  onPart?: (part: Part) => void;
}) {
  const column = at === "left" || at === "right";
  return (
    <Tappable
      part="legend"
      onPart={onPart}
      className={column ? "max-w-[34%] shrink-0 self-center p-1" : "shrink-0 p-1"}
    >
      <ul
        className={
          column
            ? "flex flex-col gap-1 overflow-hidden"
            : "flex flex-wrap items-center gap-x-4 gap-y-1"
        }
      >
        {items.map((one) => (
          <li
            key={one.name}
            className="flex min-w-0 items-center gap-1.5 text-[12px] text-fg-muted"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: `var(--hue-${one.hue}-500)` }}
            />
            <span className="truncate">{one.name}</span>
          </li>
        ))}
      </ul>
    </Tappable>
  );
}

/** The plot with its key on whichever side the report asked for. */
export function Keyed({
  at,
  legend,
  fill = false,
  children,
}: {
  at: LegendSpot;
  legend: React.ReactNode | null;
  fill?: boolean;
  children: React.ReactNode;
}) {
  if (!legend) {
    return <div className={fill ? "flex min-h-0 flex-1 flex-col" : "flex flex-col"}>{children}</div>;
  }

  const beside = at === "left" || at === "right";
  const before = at === "top" || at === "left";
  return (
    <div
      className={
        beside
          ? `flex gap-3 ${fill ? "min-h-0 flex-1" : ""}`
          : `flex flex-col gap-2 ${fill ? "min-h-0 flex-1" : ""}`
      }
    >
      {before ? legend : null}
      <div className={fill ? "flex min-h-0 min-w-0 flex-1 flex-col" : "flex min-w-0 flex-col"}>
        {children}
      </div>
      {before ? null : legend}
    </div>
  );
}

/**
 * The frame a plot is drawn in: the numbers up the side, the lines across, the
 * room left for the labels underneath, and what each axis is called.
 */
export function Frame({
  top,
  height = 220,
  fill = false,
  axis = true,
  valueTitle,
  categoryTitle,
  children,
  footer,
  grid = true,
  onPart,
}: {
  /** The value the top gridline stands at. */
  top: number;
  height?: number;
  /** Take the height the tile gives, rather than a fixed one. */
  fill?: boolean;
  /** The numbers up the side. */
  axis?: boolean;
  /** What the numbers count, and what the labels name. */
  valueTitle?: string;
  categoryTitle?: string;
  children: React.ReactNode;
  /** The labels along the bottom, drawn in the plot's own column. */
  footer?: React.ReactNode;
  /** The lines across. The baseline stays either way: a plot needs a floor. */
  grid?: boolean;
  onPart?: (part: Part) => void;
}) {
  const marks = ticks(top);
  const ruled = marks[marks.length - 1] || 1;
  const gutter = axis ? "w-10" : "w-0";

  return (
    <div className={fill ? "flex min-h-0 flex-1" : "flex"}>
      {valueTitle ? (
        <span className="flex shrink-0 items-center text-[11px] font-medium text-fg-muted [writing-mode:vertical-rl] [transform:rotate(180deg)]">
          {valueTitle}
        </span>
      ) : null}

      <div className={fill ? "flex min-h-0 min-w-0 flex-1 flex-col" : "flex min-w-0 flex-col"}>
        <div
          className={fill ? "flex min-h-0 flex-1" : "flex"}
          style={fill ? undefined : { height }}
        >
          {/* The scale. Read before the shapes, so it goes first. */}
          <Tappable
            part="axis"
            onPart={onPart}
            className={`flex ${gutter} shrink-0 flex-col justify-between pr-2 text-right`}
          >
            {axis
              ? [...marks].reverse().map((mark) => (
                  <span key={mark} className="text-[11px] leading-none text-fg-subtle tabular-nums">
                    {readable(mark)}
                  </span>
                ))
              : null}
          </Tappable>

          <div className="relative min-w-0 flex-1">
            {/* One line per number, so a shape can be read against it without
                anybody counting pixels. */}
            <div aria-hidden className="absolute inset-0 flex flex-col-reverse justify-between">
              {marks.map((mark, i) => (
                <span
                  key={mark}
                  className="w-full border-t"
                  style={{
                    borderColor:
                      i === 0
                        ? "var(--line-strong)"
                        : grid
                          ? "var(--color-line)"
                          : "transparent",
                  }}
                />
              ))}
            </div>

            <div className="absolute inset-0">{children}</div>
          </div>
        </div>

        {footer ? (
          <Tappable part="axis" onPart={onPart} className="flex shrink-0">
            <span className={`${gutter} shrink-0`} />
            <div className="min-w-0 flex-1">{footer}</div>
          </Tappable>
        ) : null}

        {categoryTitle ? (
          <span className="shrink-0 pt-1 text-center text-[11px] font-medium text-fg-muted">
            {categoryTitle}
          </span>
        ) : null}
      </div>

      {/* The ruled ceiling is what every shape in here was measured against. */}
      <span className="sr-only">{readable(ruled)}</span>
    </div>
  );
}

/**
 * What a shape stands for, shown on hover and on keyboard focus.
 *
 * Drawn by CSS rather than by state: a chart of forty bars would otherwise be
 * forty pieces of state for something the browser can do on its own.
 */
export function Hint({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-[12px] shadow-md group-hover:block group-focus-visible:block"
      role="tooltip"
    >
      <span className="font-medium text-fg">{label}</span>
      <span className="ml-1.5 text-fg-muted tabular-nums">{value}</span>
    </span>
  );
}
