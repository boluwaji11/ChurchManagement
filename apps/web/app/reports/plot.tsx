import * as React from "react";

/**
 * R18.x. The parts every chart shares: a scale, round numbers up the side, and
 * a tooltip that says what a shape stands for.
 *
 * No "use client" anywhere in here. The hover is drawn by CSS, so a chart works
 * on the server-rendered saved report and inside the builder's preview without
 * two code paths, and it keeps working for somebody whose JavaScript has not
 * arrived yet.
 */

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

/**
 * The frame a plot is drawn in: the numbers up the side, the lines across, and
 * the room left for the labels underneath.
 */
export function Frame({
  top,
  height = 220,
  children,
  footer,
}: {
  /** The value the top gridline stands at. */
  top: number;
  height?: number;
  children: React.ReactNode;
  /** The labels along the bottom, drawn in the plot's own column. */
  footer?: React.ReactNode;
}) {
  const marks = ticks(top);
  const ruled = marks[marks.length - 1] || 1;

  return (
    <div className="flex flex-col">
      <div className="flex" style={{ height }}>
        {/* The scale. Read before the shapes, so it goes first. */}
        <div className="flex w-10 shrink-0 flex-col justify-between pr-2 text-right">
          {[...marks].reverse().map((mark) => (
            <span key={mark} className="text-[11px] leading-none text-fg-subtle tabular-nums">
              {readable(mark)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* One line per number, so a shape can be read against it without
              anybody counting pixels. */}
          <div aria-hidden className="absolute inset-0 flex flex-col-reverse justify-between">
            {marks.map((mark, i) => (
              <span
                key={mark}
                className="w-full border-t"
                style={{
                  borderColor: i === 0 ? "var(--line-strong)" : "var(--color-line)",
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0">{children}</div>
        </div>
      </div>

      {footer ? (
        <div className="flex">
          <span className="w-10 shrink-0" />
          <div className="min-w-0 flex-1">{footer}</div>
        </div>
      ) : null}

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
