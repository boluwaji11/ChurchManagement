import * as React from "react";
import { t } from "@hearth/i18n";
import { Frame, Hint, ceiling, readable } from "./plot";

/**
 * R18.x. The pictures a report is read from.
 *
 * Drawn here rather than pulled from a charting library: every one of these is
 * a few divs or a path, they inherit the product's own hues and type, and a
 * hundred kilobytes of JavaScript to draw twelve bars is a hundred kilobytes a
 * church on a village connection waits for.
 *
 * Each one carries its numbers in text as well as in paint, because a chart
 * nobody can read aloud is a chart half the church cannot read.
 */

/** Standing on its own on a report, or bare inside a panel that frames it. */
const CARD = "flex flex-col rounded-[14px] border border-line bg-surface p-5";
const BARE = "flex flex-col";

export interface Slice {
  key: string;
  label: string;
  value: number;
  hue: string;
}

/** The share each thing has of the whole, as a ring with a total in the middle. */
export function Donut({
  title,
  slices,
  total,
  totalLabel,
}: {
  title?: string;
  slices: Slice[];
  total: number;
  totalLabel: string;
}) {
  const sum = slices.reduce((all, one) => all + one.value, 0) || 1;

  // Drawn as one circle per slice, each dashed to its own share and rotated to
  // where the slice before it ended. No arc arithmetic, no path strings.
  const r = 56;
  const circumference = 2 * Math.PI * r;
  let turned = 0;

  return (
    <section className={title ? CARD : BARE}>
      {title ? (
        <h3 className="mb-4 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <div className="flex flex-wrap items-center gap-6">
        <div className="relative size-[140px] shrink-0">
          <svg viewBox="0 0 140 140" className="size-full -rotate-90">
            {slices.map((one) => {
              const share = one.value / sum;
              const dash = share * circumference;
              const offset = -turned * circumference;
              turned += share;
              return (
                <circle
                  key={one.key}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  strokeWidth="18"
                  stroke={`var(--hue-${one.hue}-500)`}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span data-numeric className="font-display text-[26px] leading-7 text-fg">
              {readable(total)}
            </span>
            <span className="text-[11px] text-fg-subtle">{totalLabel}</span>
          </div>
        </div>

        <ul className="flex min-w-[140px] flex-1 flex-col gap-2">
          {slices.map((one) => (
            <li key={one.key} className="flex items-center gap-2.5 text-[13px]">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: `var(--hue-${one.hue}-500)` }}
              />
              <span className="min-w-0 flex-1 truncate text-fg" title={one.label}>
                {one.label}
              </span>
              <span className="shrink-0 text-fg-muted tabular-nums">
                {readable(one.value)}
              </span>
              <span className="w-9 shrink-0 text-right text-fg-subtle tabular-nums">
                {Math.round((one.value / sum) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export interface Point {
  key: string;
  label: string;
  value: number;
}

/**
 * A line across time, with the zero line drawn where the numbers cross it.
 *
 * Used where the shape matters more than any single month: a church watching
 * its net change wants to see three months of falling, not read four numbers
 * and work it out.
 */
export function Line({
  title,
  points,
  hue = "indigo",
  aside,
  filled = true,
}: {
  title?: string;
  points: Point[];
  hue?: string;
  aside?: string;
  /** Filled under the line, which reads as a quantity rather than a direction. */
  filled?: boolean;
}) {
  const values = points.map((one) => one.value);
  const floor = Math.min(0, ...values);
  const top = ceiling(Math.max(1, ...values));
  const range = top - floor || 1;

  const W = 100;
  const H = 40;
  const at = (one: Point, i: number) => ({
    x: points.length === 1 ? W / 2 : (i / (points.length - 1)) * W,
    y: H - ((one.value - floor) / range) * H,
  });

  const path = points
    .map((one, i) => {
      const { x, y } = at(one, i);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const zero = H - ((0 - floor) / range) * H;
  const every = points.length > 8 ? Math.ceil(points.length / 8) : 1;

  return (
    <section className={title ? CARD : BARE}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        {title ? (
          <h3 className="font-display text-[22px] leading-7 text-fg">{title}</h3>
        ) : <span />}
        {aside ? <span className="text-caption text-fg-subtle">{aside}</span> : null}
      </div>

      <Frame
        top={top}
        footer={
          <div className="flex pt-1.5">
            {points.map((one, i) => (
              <span
                key={one.key}
                className="min-w-0 flex-1 truncate text-center text-[11px] text-fg-subtle"
              >
                {i % every === 0 ? one.label : ""}
              </span>
            ))}
          </div>
        }
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="size-full"
          role="img"
          aria-label={title ?? ""}
        >
          {filled ? (
            <path d={`${path} L${W},${zero} L0,${zero} Z`} fill={`var(--hue-${hue}-tint)`} opacity="0.7" />
          ) : null}
          <path
            d={path}
            fill="none"
            stroke={`var(--hue-${hue}-500)`}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* The points as elements rather than circles in a stretched viewBox,
            so they stay round and can be hovered. */}
        <div className="absolute inset-0">
          {points.map((one, i) => {
            const { x, y } = at(one, i);
            return (
              <span
                key={one.key}
                tabIndex={0}
                className="group absolute size-5 -translate-x-1/2 -translate-y-1/2 cursor-default outline-none"
                style={{ left: `${x}%`, top: `${(y / H) * 100}%` }}
              >
                <Hint label={one.label} value={readable(one.value)} />
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface transition-transform group-hover:scale-150"
                  style={{ background: `var(--hue-${hue}-key)` }}
                />
              </span>
            );
          })}
        </div>
      </Frame>
    </section>
  );
}

/** Two numbers side by side per step, for new against lapsed. */
export function Columns({
  title,
  groups,
  series,
}: {
  title?: string;
  groups: { key: string; label: string; values: number[] }[];
  series: { label: string; hue: string }[];
}) {
  const top = ceiling(Math.max(1, ...groups.flatMap((one) => one.values)));

  // Past this many columns the labels collide, so every other one is drawn and
  // the rest are still read from the tooltip.
  const every = groups.length > 12 ? Math.ceil(groups.length / 12) : 1;

  return (
    <section className={title ? CARD : BARE}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        {title ? (
          <h3 className="font-display text-[22px] leading-7 text-fg">{title}</h3>
        ) : <span />}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((one) => (
            <li key={one.label} className="flex items-center gap-1.5 text-[12px] text-fg-muted">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: `var(--hue-${one.hue}-500)` }}
              />
              {one.label}
            </li>
          ))}
        </ul>
      </div>

      <Frame
        top={top}
        footer={
          <div className="flex gap-2 pt-1.5">
            {groups.map((group, i) => (
              <span
                key={group.key}
                className="min-w-0 flex-1 truncate text-center text-[11px] text-fg-subtle"
              >
                {i % every === 0 ? group.label : ""}
              </span>
            ))}
          </div>
        }
      >
        <ol className="flex h-full items-end gap-2">
          {groups.map((group) => (
            <li
              key={group.key}
              tabIndex={0}
              className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] outline-none"
            >
              <Hint
                label={group.label}
                value={group.values.map((one) => readable(one)).join(" / ")}
              />
              {group.values.map((value, i) => (
                <span
                  key={series[i]?.label ?? i}
                  aria-hidden
                  className="w-full max-w-5 rounded-t-[3px] transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${Math.max(value > 0 ? 1 : 0, Math.round((value / top) * 100))}%`,
                    background: `var(--hue-${series[i]?.hue ?? "indigo"}-500)`,
                  }}
                />
              ))}
            </li>
          ))}
        </ol>
      </Frame>
    </section>
  );
}

/** A row of bars read down the page, for a handful of named things. */
export function RowBars({
  title,
  rows,
  hue = "teal",
}: {
  title?: string;
  rows: { key: string; label: string; value: number; note?: string }[];
  hue?: string;
}) {
  const most = Math.max(1, ...rows.map((one) => one.value));

  return (
    <section className={title ? CARD : BARE}>
      {title ? (
        <h3 className="mb-4 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <ol className="flex flex-col gap-2.5">
        {rows.map((one) => (
          <li key={one.key} className="group relative flex items-center gap-3" tabIndex={0}>
            <span className="w-24 shrink-0 truncate text-[13px] text-fg-muted" title={one.label}>
              {one.label}
            </span>
            <span className="relative h-5 min-w-0 flex-1 overflow-hidden rounded-sm bg-sunken">
              <span
                aria-hidden
                className="block h-full rounded-sm transition-opacity group-hover:opacity-80"
                style={{
                  width: `${Math.max(2, Math.round((one.value / most) * 100))}%`,
                  background: `var(--hue-${hue}-500)`,
                }}
              />
            </span>
            {one.note ? (
              <span className="w-16 shrink-0 text-right text-[12px] text-fg-subtle tabular-nums">
                {one.note}
              </span>
            ) : null}
            <span className="w-10 shrink-0 text-right text-[13px] font-medium text-fg tabular-nums">
              {readable(one.value)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The funnel: each step as a bar whose width is its share of the first step,
 * with what fell away drawn behind it.
 *
 * The place the funnel narrows is the thing the church has to fix, so it is
 * the thing the eye should land on.
 */
export function Funnel({
  title,
  steps,
}: {
  title?: string;
  steps: { key: string; label: string; members: number; rate: number; note: string }[];
}) {
  const most = Math.max(1, steps[0]?.members ?? 1);
  const hues = ["amber", "citron", "teal", "sky", "indigo"];

  return (
    <section className={title ? CARD : BARE}>
      {title ? (
        <h3 className="mb-4 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <ol className="flex flex-col gap-3.5">
        {steps.map((one, i) => {
          const lost = i > 0 ? steps[i - 1]!.members - one.members : 0;
          return (
            <li key={one.key} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="min-w-[160px] flex-1 font-medium text-fg">{one.label}</span>
                <span data-numeric className="text-[length:var(--d-text-body)] text-fg">
                  {one.members}
                </span>
                <span className="w-14 text-right text-caption text-fg-muted tabular-nums">
                  {i > 0 ? `${one.rate}%` : ""}
                </span>
                <span className="w-24 text-right text-caption text-fg-subtle">{one.note}</span>
              </div>

              <span className="flex h-2.5 overflow-hidden rounded-full bg-sunken">
                <span
                  aria-hidden
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(1, Math.round((one.members / most) * 100))}%`,
                    background: `var(--hue-${hues[i % hues.length]}-500)`,
                  }}
                />
              </span>

              {lost > 0 ? (
                <span className="text-[12px] text-fg-subtle">
                  {t("reports.lostHere", { count: String(lost) })}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}


/**
 * R18.12. One bar split into its parts.
 *
 * The question a ring answers, in a shape that holds more of them and lines up
 * against other bars. Each part carries its own share, and anything too thin
 * to label still says what it is on hover.
 */
export function Stacked({
  title,
  slices,
}: {
  title?: string;
  slices: Slice[];
}) {
  const sum = slices.reduce((all, one) => all + one.value, 0) || 1;

  return (
    <section className={title ? CARD : BARE}>
      {title ? (
        <h3 className="mb-4 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <div className="flex h-12 w-full overflow-hidden rounded-lg">
        {slices.map((one) => {
          const share = (one.value / sum) * 100;
          return (
            <span
              key={one.key}
              tabIndex={0}
              className="group relative flex items-center justify-center outline-none transition-opacity hover:opacity-85"
              style={{ width: `${share}%`, background: `var(--hue-${one.hue}-500)` }}
            >
              <Hint label={one.label} value={`${readable(one.value)} \u00b7 ${Math.round(share)}%`} />
              {/* The number only where there is room for it. */}
              {share >= 9 ? (
                <span className="px-1 text-[11px] font-semibold text-white tabular-nums">
                  {Math.round(share)}%
                </span>
              ) : null}
            </span>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {slices.map((one) => (
          <li key={one.key} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: `var(--hue-${one.hue}-500)` }}
            />
            <span className="truncate text-fg">{one.label}</span>
            <span className="text-fg-muted tabular-nums">{readable(one.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
