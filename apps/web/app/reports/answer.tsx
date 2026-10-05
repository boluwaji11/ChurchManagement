/**
 * R18.12. Reading a built report's output.
 *
 * No "use client" on purpose. The builder renders this in the browser as it
 * previews, and the saved report renders it on the server, so it has to work in
 * both graphs. That is also why `read` lives here: a plain function exported
 * from a client module cannot be called by a server component, which is exactly
 * the error that put this file here.
 */
import * as React from "react";
import { t } from "@hearth/i18n";
import { CHART_HUES, VIEW_NEEDS, type ReportSpec } from "@hearth/db/rules";
import { Table, Thead, Tr, Th, Td } from "@hearth/ui";
import { Columns, Donut, Line, RowBars, Series, Stacked, type Slice } from "./charts";

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

/** Booleans come back from Postgres as words nobody wants to read. */
export function read(value: string): string {
  if (value === "true") return t("report.yes");
  if (value === "false") return t("report.no");
  return value === "" ? t("report.blank") : value;
}

/**
 * R18.12. The output, drawn the way the report asked for.
 *
 * Shared by the builder and the saved report, so what was built is what is
 * read.
 */
export function Answer({
  spec,
  result,
  rows: shown = 12,
  fill = false,
}: {
  spec: ReportSpec;
  result: {
    columns: { key: string; label: string; kind: string }[];
    rows: string[][];
    chart: { label: string; value: number }[] | null;
    grid?: { labels: string[]; series: { name: string; values: number[] }[] } | null;
    total?: number | null;
  };
  rows?: number;
  /** Take the height the tile gives, rather than drawing at a fixed one. */
  fill?: boolean;
}) {
  // Each visualization says how many answers it can carry before it stops
  // being readable, and the gallery says so on screen rather than the chart
  // quietly drawing forty slices nobody can tell apart.
  // Two dimensions: one column per answer, split into its series.
  if (result.grid && (spec.view === "bar" || spec.view === "stacked")) {
    const hues = spectrum(spec.look.hue);
    return (
      <Series
        labels={result.grid.labels.map(read)}
        stacked={spec.view === "stacked"}
        legend={spec.look.legend}
        grid={spec.look.grid}
        fill={fill}
        series={result.grid.series.map((one, i) => ({
          name: read(one.name),
          values: one.values,
          hue: hues[i % hues.length]!,
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
        labels={look.labels}
        legend={look.legend}
        grid={look.grid}
        fill={fill}
        series={[{ label: t("report.measure.value"), hue: look.hue }]}
        groups={chart.map((one) => ({
          key: one.key, label: one.label, values: [one.value],
        }))}
      />
    );
  }

  if (spec.view === "rows" && chart.length > 0) {
    return <RowBars rows={chart} hue={look.hue} fill={fill} />;
  }

  if ((spec.view === "stacked" || spec.view === "donut") && chart.length > 0) {
    const hues = spectrum(look.hue);
    const slices: Slice[] = chart.map((one, i) => ({
      key: one.key,
      label: one.label,
      value: one.value,
      hue: hues[i % hues.length]!,
    }));
    return spec.view === "stacked" ? (
      <Stacked slices={slices} fill={fill} />
    ) : (
      <Donut
        slices={slices}
        total={slices.reduce((all, one) => all + one.value, 0)}
        totalLabel={t("report.measure.value")}
        fill={fill}
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
        points={points}
        hue={look.hue}
        labels={look.labels}
        grid={look.grid}
        fill={fill}
        filled={spec.view === "area"}
      />
    );
  }

  // The tallest number in each column, so a cell can be drawn against it.
  const tallest = result.columns.map((column, c) =>
    column.kind === "number"
      ? Math.max(0, ...result.rows.map((row) => Number(row[c] ?? 0) || 0))
      : 0,
  );

  // A table of rows is the one output that cannot be made to fit a box: it
  // scrolls inside the tile rather than pushing the tile open.
  return (
    <div className={fill ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto"}>
      <Table>
        <Thead>
          <Tr>
            {result.columns.map((one) => (
              <Th key={one.key}>{t(one.label as never)}</Th>
            ))}
          </Tr>
        </Thead>
        <tbody>
          {result.rows.slice(0, shown).map((row, i) => (
            <Tr key={i}>
              {row.map((value, c) => {
                const top = tallest[c] ?? 0;
                const n = Number(value);
                const measured = top > 0 && Number.isFinite(n);
                return (
                  <Td key={c} className={measured ? "relative text-fg tabular-nums" : "text-fg"}>
                    {measured ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0 rounded-sm"
                        style={{
                          width: `${Math.max(1, Math.round((n / top) * 100))}%`,
                          background: "var(--hue-indigo-tint)",
                        }}
                      />
                    ) : null}
                    <span className="relative">{read(value)}</span>
                  </Td>
                );
              })}
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
