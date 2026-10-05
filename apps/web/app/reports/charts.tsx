import * as React from "react";
import { t } from "@connectapp/i18n";
import type { LabelKind, LegendSpot } from "@connectapp/db/rules";
import { Frame, Hint, Key, Keyed, Tappable, ceiling, readable, type Part } from "./plot";

/** What a label on a shape says, given the share it stands for. */
export const labelled = (value: number, share: number, kind: LabelKind): string =>
  kind === "percent"
    ? `${Math.round(share * 100)}%`
    : kind === "both"
      ? `${readable(value)} \u00b7 ${Math.round(share * 100)}%`
      : readable(value);

/** What every chart here takes, beyond its own numbers. */
export interface Look {
  labels?: boolean;
  labelKind?: LabelKind;
  legend?: boolean;
  legendAt?: LegendSpot;
  grid?: boolean;
  axis?: boolean;
  valueTitle?: string;
  categoryTitle?: string;
  fill?: boolean;
  onPart?: (part: Part) => void;
}

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
/** Inside a tile, where the chart is given a height rather than choosing one. */
const FILLED = "flex min-h-0 flex-1 flex-col";

/** What the chart's own element is, standing alone or filling the box it is in. */
const shell = (title: string | undefined, fill: boolean): string =>
  fill ? FILLED : title ? CARD : BARE;

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
  labels = false,
  labelKind = "percent",
  legend = true,
  legendAt = "right",
  fill = false,
  onPart,
}: Look & {
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
    <section className={shell(title, fill)}>
      {title ? (
        <h3 className="mb-4 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <div
        className={
          fill
            ? "flex min-h-0 flex-1 flex-wrap items-center gap-6 overflow-hidden"
            : "flex flex-wrap items-center gap-6"
        }
      >
        <Tappable part="colour" onPart={onPart} className="relative size-[140px] shrink-0">
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
                  strokeWidth="24"
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
        </Tappable>

        {/* The ring's own key, which carries the number as well as the colour,
            so a slice too thin to see is still read. */}
        {legend ? (
          <Tappable
            part="legend"
            onPart={onPart}
            className={
              legendAt === "top" || legendAt === "bottom"
                ? "w-full min-w-0 p-1"
                : "min-w-[140px] flex-1 p-1"
            }
          >
            <ul className="flex flex-col gap-2">
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
                    {labels
                      ? labelled(one.value, one.value / sum, labelKind)
                      : readable(one.value)}
                  </span>
                </li>
              ))}
            </ul>
          </Tappable>
        ) : null}
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
  labels = false,
  labelKind = "value",
  grid = true,
  axis = true,
  valueTitle,
  categoryTitle,
  fill = false,
  onPart,
}: Look & {
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
  const sum = values.reduce((all, one) => all + one, 0) || 1;

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
    <section className={shell(title, fill)}>
      {title || aside ? (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          {title ? (
            <h3 className="font-display text-[22px] leading-7 text-fg">{title}</h3>
          ) : <span />}
          {aside ? <span className="text-caption text-fg-subtle">{aside}</span> : null}
        </div>
      ) : null}

      <Frame
        grid={grid}
        fill={fill}
        axis={axis}
        valueTitle={valueTitle}
        categoryTitle={categoryTitle}
        onPart={onPart}
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
                {labels ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-fg-muted tabular-nums">
                    {labelled(one.value, one.value / sum, labelKind)}
                  </span>
                ) : null}
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
  labels = false,
  labelKind = "value",
  legend = true,
  legendAt = "top",
  grid = true,
  axis = true,
  valueTitle,
  categoryTitle,
  fill = false,
  onPart,
}: Look & {
  title?: string;
  groups: { key: string; label: string; values: number[] }[];
  series: { label: string; hue: string }[];
}) {
  const top = ceiling(Math.max(1, ...groups.flatMap((one) => one.values)));
  const sum = groups.reduce((all, one) => all + one.values.reduce((a, b) => a + b, 0), 0) || 1;

  // Past this many columns the labels collide, so every other one is drawn and
  // the rest are still read from the tooltip.
  const every = groups.length > 12 ? Math.ceil(groups.length / 12) : 1;

  return (
    <section className={shell(title, fill)}>
      {title ? (
        <h3 className="mb-3 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <Keyed
        fill={fill}
        at={legendAt}
        legend={
          legend ? (
            <Key
              at={legendAt}
              onPart={onPart}
              items={series.map((one) => ({ name: one.label, hue: one.hue }))}
            />
          ) : null
        }
      >
        <Frame
          grid={grid}
          fill={fill}
          axis={axis}
          valueTitle={valueTitle}
          categoryTitle={categoryTitle}
          onPart={onPart}
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
            {groups.map((group) => {
              const stack = group.values.reduce((all, one) => all + one, 0);
              return (
                <li
                  key={group.key}
                  tabIndex={0}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] outline-none"
                >
                  <Hint
                    label={group.label}
                    value={group.values.map((one) => readable(one)).join(" / ")}
                  />
                  {labels ? (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-fg-muted tabular-nums">
                      {labelled(stack, stack / sum, labelKind)}
                    </span>
                  ) : null}
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
              );
            })}
          </ol>
        </Frame>
      </Keyed>
    </section>
  );
}

/** A row of bars read down the page, for a handful of named things. */
export function RowBars({
  title,
  rows,
  hue = "teal",
  labels = true,
  labelKind = "value",
  fill = false,
  onPart,
}: Look & {
  title?: string;
  rows: { key: string; label: string; value: number; note?: string }[];
  hue?: string;
}) {
  const most = Math.max(1, ...rows.map((one) => one.value));
  const sum = rows.reduce((all, one) => all + one.value, 0) || 1;

  return (
    <section className={shell(title, fill)}>
      {title ? (
        <h3 className="mb-4 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      {/* Filling a tile, the rows share the height between them, so however
          many there are they all land inside it. */}
      <Tappable
        part="colour"
        onPart={onPart}
        className={fill ? "flex min-h-0 flex-1 flex-col" : "flex flex-col"}
      >
        <ol className={fill ? "flex min-h-0 flex-1 flex-col gap-2.5" : "flex flex-col gap-2.5"}>
          {rows.map((one) => (
            <li
              key={one.key}
              className={
                fill
                  ? "group relative flex min-h-0 flex-1 items-center gap-3"
                  : "group relative flex items-center gap-3"
              }
              tabIndex={0}
            >
              <span className="w-24 shrink-0 truncate text-[13px] text-fg-muted" title={one.label}>
                {one.label}
              </span>
              <span
                className={
                  fill
                    ? "relative h-full max-h-5 min-w-0 flex-1 overflow-hidden rounded-sm bg-sunken"
                    : "relative h-5 min-w-0 flex-1 overflow-hidden rounded-sm bg-sunken"
                }
              >
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
              {labels ? (
                <span className="w-14 shrink-0 text-right text-[13px] font-medium text-fg tabular-nums">
                  {labelled(one.value, one.value / sum, labelKind)}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Tappable>
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
  labels = true,
  labelKind = "percent",
  legend = true,
  legendAt = "bottom",
  fill = false,
  onPart,
}: Look & {
  title?: string;
  slices: Slice[];
}) {
  const sum = slices.reduce((all, one) => all + one.value, 0) || 1;

  return (
    <section className={shell(title, fill)}>
      {title ? (
        <h3 className="mb-4 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <Keyed
        fill={fill}
        at={legendAt}
        legend={
          legend ? (
            <Key
              at={legendAt}
              onPart={onPart}
              items={slices.map((one) => ({ name: one.label, hue: one.hue }))}
            />
          ) : null
        }
      >
        <Tappable
          part="colour"
          onPart={onPart}
          className={fill ? "flex min-h-0 flex-1 flex-col justify-center" : "flex flex-col"}
        >
          <div className="flex h-12 w-full shrink-0 overflow-hidden rounded-lg">
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
                  {labels && share >= 9 ? (
                    <span className="px-1 text-[11px] font-semibold text-white tabular-nums">
                      {labelled(one.value, one.value / sum, labelKind)}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        </Tappable>
      </Keyed>
    </section>
  );
}


/**
 * R18.12. One column per answer, split into its series.
 *
 * The grouped form stands them side by side, which compares the series. The
 * stacked form puts them on top of each other, which compares the totals. Both
 * are the same numbers and the choice is which question is being asked.
 */
export function Series({
  title,
  labels: names,
  series,
  stacked = false,
  valueLabels = false,
  labelKind = "value",
  legend = true,
  legendAt = "top",
  grid = true,
  axis = true,
  valueTitle,
  categoryTitle,
  fill = false,
  onPart,
}: Omit<Look, "labels"> & {
  title?: string;
  /** The names along the category axis. */
  labels: string[];
  /** The number drawn on each column. */
  valueLabels?: boolean;
  series: { name: string; values: number[]; hue: string }[];
  stacked?: boolean;
}) {
  const columnTotals = names.map((_, i) =>
    series.reduce((all, one) => all + (one.values[i] ?? 0), 0));
  const top = ceiling(
    stacked
      ? Math.max(1, ...columnTotals)
      : Math.max(1, ...series.flatMap((one) => one.values)),
  );
  const sum = columnTotals.reduce((all, one) => all + one, 0) || 1;
  const every = names.length > 12 ? Math.ceil(names.length / 12) : 1;

  return (
    <section className={shell(title, fill)}>
      {title ? (
        <h3 className="mb-3 font-display text-[22px] leading-7 text-fg">{title}</h3>
      ) : null}

      <Keyed
        fill={fill}
        at={legendAt}
        legend={
          legend ? (
            <Key
              at={legendAt}
              onPart={onPart}
              items={series.map((one) => ({
                name: one.name === "" ? t("report.blank") : one.name,
                hue: one.hue,
              }))}
            />
          ) : null
        }
      >
        <Frame
          grid={grid}
          fill={fill}
          axis={axis}
          valueTitle={valueTitle}
          categoryTitle={categoryTitle}
          onPart={onPart}
          top={top}
          footer={
            <div className="flex gap-2 pt-1.5">
              {names.map((label, i) => (
                <span
                  key={label + i}
                  className="min-w-0 flex-1 truncate text-center text-[11px] text-fg-subtle"
                >
                  {i % every === 0 ? label : ""}
                </span>
              ))}
            </div>
          }
        >
          <ol className="flex h-full items-end gap-2">
            {names.map((label, i) => (
              <li
                key={label + i}
                tabIndex={0}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] outline-none"
              >
                <Hint
                  label={label === "" ? t("report.blank") : label}
                  value={readable(columnTotals[i] ?? 0)}
                />

                {valueLabels ? (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-fg-muted tabular-nums">
                    {labelled(columnTotals[i] ?? 0, (columnTotals[i] ?? 0) / sum, labelKind)}
                  </span>
                ) : null}

                {stacked ? (
                  <span
                    className="flex w-full max-w-7 flex-col-reverse overflow-hidden rounded-t-[3px]"
                    style={{ height: `${Math.round(((columnTotals[i] ?? 0) / top) * 100)}%` }}
                  >
                    {series.map((one) => {
                      const share = (one.values[i] ?? 0) / (columnTotals[i] || 1);
                      return (
                        <span
                          key={one.name}
                          aria-hidden
                          className="w-full"
                          style={{
                            height: `${share * 100}%`,
                            background: `var(--hue-${one.hue}-500)`,
                          }}
                        />
                      );
                    })}
                  </span>
                ) : (
                  series.map((one) => (
                    <span
                      key={one.name}
                      aria-hidden
                      className="w-full max-w-5 rounded-t-[3px] transition-opacity group-hover:opacity-80"
                      style={{
                        height: `${Math.max((one.values[i] ?? 0) > 0 ? 1 : 0, Math.round(((one.values[i] ?? 0) / top) * 100))}%`,
                        background: `var(--hue-${one.hue}-500)`,
                      }}
                    />
                  ))
                )}
              </li>
            ))}
          </ol>
        </Frame>
      </Keyed>
    </section>
  );
}
