/**
 * R18.12. Reading a built report's output.
 *
 * No "use client" on purpose. The builder renders this in the browser as it
 * previews, and the saved report renders it on the server, so it has to work in
 * both graphs. The one piece that does need the browser is paging a list, and
 * that is its own client component rendered from here.
 */
import * as React from "react";
import { t } from "@hearth/i18n";
import { CHART_HUES, VIEW_NEEDS, type ReportLook, type ReportSpec } from "@hearth/db/rules";
import { Columns, Donut, Line, RowBars, Series, Stacked, type Slice } from "./charts";
import type { Part } from "./plot";
import { Rows } from "./rows";
import { read } from "./read";

export { read };
export type { Part };

/**
 * The spectrum, turned so the chosen colour leads it.
 *
 * A chart with a legend still has one colour anybody would call its colour: the
 * first one. Picking that one turns the whole spectrum under it, so the swatches
 * do something on a split chart as well as on a plain one.
 */
function spectrum(first: string): string[] {
  const at = CHART_HUES.indexOf(first as (typeof CHART_HUES)[number]);
  const from = at < 0 ? 0 : at;
  return CHART_HUES.map((_, i) => CHART_HUES[(from + i) % CHART_HUES.length]!);
}

/**
 * A colour for every series: the one set on that series, or the spectrum from
 * the lead colour where nobody has set one.
 */
export function palette(look: ReportLook, many: number): string[] {
  const spread = spectrum(look.hue);
  return Array.from(
    { length: many },
    (_, i) => look.hues[i] ?? spread[i % spread.length]!,
  );
}

/** The format options every chart takes, out of the look. */
const dressed = (look: ReportLook, fill: boolean, onPart?: (part: Part) => void) => ({
  labelKind: look.labelKind,
  legend: look.legend,
  legendAt: look.legendAt,
  grid: look.grid,
  axis: look.valueAxis,
  valueTitle: look.valueTitle || undefined,
  categoryTitle: look.categoryTitle || undefined,
  fill,
  onPart,
});

/**
 * R18.12. The output, drawn the way the report asked for.
 *
 * Shared by the builder and the saved report, so what was built is what is
 * read.
 */
export function Answer({
  spec,
  result,
  fill = false,
  onPart,
}: {
  spec: ReportSpec;
  result: {
    columns: { key: string; label: string; kind: string }[];
    rows: string[][];
    chart: { label: string; value: number }[] | null;
    grid?: { labels: string[]; series: { name: string; values: number[] }[] } | null;
    total?: number | null;
  };
  /** Take the height the tile gives, rather than drawing at a fixed one. */
  fill?: boolean;
  /** What to open the Format pane on, when a piece of the visual is pressed. */
  onPart?: (part: Part) => void;
}) {
  // Each visualization says how many answers it can carry before it stops
  // being readable, and the gallery says so on screen rather than the chart
  // quietly drawing forty slices nobody can tell apart.
  // Two dimensions: one column per answer, split into its series.
  if (result.grid && (spec.view === "bar" || spec.view === "stacked")) {
    const hues = palette(spec.look, result.grid.series.length);
    return (
      <Series
        {...dressed(spec.look, fill, onPart)}
        labels={result.grid.labels.map(read)}
        valueLabels={spec.look.labels}
        stacked={spec.view === "stacked"}
        series={result.grid.series.map((one, i) => ({
          name: read(one.name),
          values: one.values,
          hue: hues[i]!,
        }))}
      />
    );
  }

  const limit = VIEW_NEEDS[spec.view].readableUpTo;
  const all = (result.chart ?? []).map((one, i) => ({
    key: `${one.label}-${i}`,
    label: read(one.label),
    value: one.value,
  }));
  // Ordered the way the look asks: by what it counted, or by what it counts.
  const look = spec.look;
  const ordered = [...all].sort((a, b) =>
    look.sort === "label"
      ? a.label.localeCompare(b.label, undefined, { numeric: true })
      : a.value - b.value);
  if (look.dir === "desc") ordered.reverse();

  const chart = limit ? ordered.slice(0, limit) : ordered;

  if (spec.view === "number") {
    const total = result.chart
      ? result.chart.reduce((all, one) => all + one.value, 0)
      : result.rows.length;

    // A number on its own is a number. What it is made of is the next question
    // anybody asks, so the largest answer is said under it.
    const biggest = result.chart
      ? [...result.chart].sort((a, b) => b.value - a.value)[0]
      : null;

    return (
      <div className={fill ? "flex flex-col justify-center gap-1" : "flex flex-col gap-1"}>
        <p data-numeric className="font-display text-[64px] leading-[68px] text-fg">
          {total.toLocaleString()}
        </p>
        {biggest && result.chart && result.chart.length > 1 ? (
          <p className="text-[13px] text-fg-muted">
            {t("report.largest", {
              label: read(biggest.label),
              share: String(Math.round((biggest.value / (total || 1)) * 100)),
            })}
          </p>
        ) : null}
      </div>
    );
  }

  if (spec.view === "bar" && chart.length > 0) {
    return (
      <Columns
        {...dressed(look, fill, onPart)}
        labels={look.labels}
        series={[{ label: t("report.measure.value"), hue: look.hues[0] ?? look.hue }]}
        groups={chart.map((one) => ({
          key: one.key, label: one.label, values: [one.value],
        }))}
      />
    );
  }

  if (spec.view === "rows" && chart.length > 0) {
    return (
      <RowBars
        {...dressed(look, fill, onPart)}
        rows={chart}
        hue={look.hues[0] ?? look.hue}
        labels={look.labels}
      />
    );
  }

  if ((spec.view === "stacked" || spec.view === "donut") && chart.length > 0) {
    const hues = palette(look, chart.length);
    const slices: Slice[] = chart.map((one, i) => ({
      key: one.key,
      label: one.label,
      value: one.value,
      hue: hues[i]!,
    }));
    return spec.view === "stacked" ? (
      <Stacked {...dressed(look, fill, onPart)} slices={slices} labels={look.labels} />
    ) : (
      <Donut
        {...dressed(look, fill, onPart)}
        slices={slices}
        labels={look.labels}
        total={slices.reduce((all, one) => all + one.value, 0)}
        totalLabel={t("report.measure.value")}
      />
    );
  }

  if ((spec.view === "line" || spec.view === "area") && chart.length > 0) {
    // Along its own order rather than by size, because a line is read as time.
    // A line is read as time, so it keeps its own order whatever the sort says.
    const points = [...chart].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }));
    return (
      <Line
        {...dressed(look, fill, onPart)}
        points={points}
        hue={look.hues[0] ?? look.hue}
        labels={look.labels}
        filled={spec.view === "area"}
      />
    );
  }

  // A list is read a page at a time, as many rows to a page as the report
  // was built with.
  return (
    <Rows
      columns={result.columns}
      rows={result.rows}
      perPage={look.perPage}
      fill={fill}
    />
  );
}
