import * as React from "react";
import { t } from "@hearth/i18n";

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
              {total}
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
              <span className="min-w-0 flex-1 truncate text-fg">{one.label}</span>
              <span className="shrink-0 text-fg-muted tabular-nums">
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
}: {
  title?: string;
  points: Point[];
  hue?: string;
  aside?: string;
}) {
  const values = points.map((one) => one.value);
  const top = Math.max(1, ...values);
  const floor = Math.min(0, ...values);
  const range = top - floor || 1;

  const W = 100;
  const H = 40;
  const at = (one: Point, i: number) => ({
    x: points.length === 1 ? W / 2 : (i / (points.length - 1)) * W,
    y: H - ((one.value - floor) / range) * H,
  });

  const path = points.map((one, i) => {
    const { x, y } = at(one, i);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  const zero = H - ((0 - floor) / range) * H;

  return (
    <section className={title ? CARD : BARE}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        {title ? (
          <h3 className="font-display text-[22px] leading-7 text-fg">{title}</h3>
        ) : <span />}
        {aside ? <span className="text-caption text-fg-subtle">{aside}</span> : null}
      </div>

      <div className="relative h-[160px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="size-full"
          role="img"
          aria-label={title}
        >
          {/* Under the line, so the shape reads as a quantity rather than as a
              wire. */}
          <path
            d={`${path} L${W},${zero} L0,${zero} Z`}
            fill={`var(--hue-${hue}-tint)`}
            opacity="0.7"
          />
          <path
            d={`M0,${zero} L${W},${zero}`}
            stroke="var(--line-strong)"
            strokeWidth="0.3"
            strokeDasharray="1.5 1.5"
            vectorEffect="non-scaling-stroke"
          />
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

        {/* The points themselves, as elements rather than circles in the
            stretched viewBox, so they stay round. */}
        <div className="pointer-events-none absolute inset-0">
          {points.map((one, i) => {
            const { x, y } = at(one, i);
            return (
              <span
                key={one.key}
                title={`${one.label}: ${one.value}`}
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                style={{
                  left: `${x}%`,
                  top: `${(y / H) * 100}%`,
                  background: `var(--hue-${hue}-key)`,
                }}
              />
            );
          })}
        </div>
      </div>

      {points.length > 1 ? (
        <div className="mt-3 flex justify-between text-caption text-fg-subtle">
          <span>{points[0]!.label}</span>
          <span>{points[points.length - 1]!.label}</span>
        </div>
      ) : null}
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
  const most = Math.max(1, ...groups.flatMap((one) => one.values));

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

      <ol className="flex h-[160px] items-end gap-2">
        {groups.map((group) => (
          <li
            key={group.key}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]"
            title={`${group.label}: ${group.values.join(" / ")}`}
          >
            {group.values.map((value, i) => (
              <span
                key={series[i]?.label ?? i}
                aria-hidden
                className="w-full max-w-5 rounded-t-[3px]"
                style={{
                  height: `${Math.max(1, Math.round((value / most) * 100))}%`,
                  background: `var(--hue-${series[i]?.hue ?? "indigo"}-500)`,
                }}
              />
            ))}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex justify-between text-caption text-fg-subtle">
        <span>{groups[0]?.label}</span>
        <span>{groups.length > 1 ? groups[groups.length - 1]!.label : ""}</span>
      </div>
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
          <li key={one.key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[13px] text-fg-muted">{one.label}</span>
            <span className="h-5 min-w-0 flex-1 overflow-hidden rounded-sm bg-sunken">
              <span
                aria-hidden
                className="block h-full rounded-sm"
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
            <span className="w-8 shrink-0 text-right text-[13px] font-medium text-fg tabular-nums">
              {one.value}
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
  steps: { key: string; label: string; people: number; rate: number; note: string }[];
}) {
  const most = Math.max(1, steps[0]?.people ?? 1);
  const hues = ["amber", "citron", "teal", "sky", "indigo"];

  return (
    <section className={title ? CARD : BARE}>
      {title ? (
        <h3 className="mb-4 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <ol className="flex flex-col gap-3.5">
        {steps.map((one, i) => {
          const lost = i > 0 ? steps[i - 1]!.people - one.people : 0;
          return (
            <li key={one.key} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="min-w-[160px] flex-1 font-medium text-fg">{one.label}</span>
                <span data-numeric className="text-[length:var(--d-text-body)] text-fg">
                  {one.people}
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
                    width: `${Math.max(1, Math.round((one.people / most) * 100))}%`,
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
