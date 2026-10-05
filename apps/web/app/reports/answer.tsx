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
import { VIEW_NEEDS, type ReportSpec } from "@hearth/db/rules";
import { Table, Thead, Tr, Th, Td } from "@hearth/ui";
import { Columns, Donut, Line, RowBars, Series, Stacked, type Slice } from "./charts";

/** A spectrum for a ring, so nine answers are nine colours. */
const RING_HUES = ["indigo", "sky", "teal", "fern", "citron", "amber", "clay", "rose", "violet"];

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
}) {
  // Each visualization says how many answers it can carry before it stops
  // being readable, and the gallery says so on screen rather than the chart
  // quietly drawing forty slices nobody can tell apart.
  // Two dimensions: one column per answer, split into its series.
  if (result.grid && (spec.view === "bar" || spec.view === "stacked")) {
    return (
      <Series
        labels={result.grid.labels.map(read)}
        stacked={spec.view === "stacked"}
        series={result.grid.series.map((one, i) => ({
          name: read(one.name),
          values: one.values,
          hue: RING_HUES[i % RING_HUES.length]!,
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
  const chart = limit ? all.slice(0, limit) : all;

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
      <div className="flex flex-col gap-1">
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
        series={[{ label: t("report.measure.value"), hue: "indigo" }]}
        groups={chart.map((one) => ({
          key: one.key, label: one.label, values: [one.value],
        }))}
      />
    );
  }

  if (spec.view === "rows" && chart.length > 0) {
    return <RowBars rows={chart} hue="indigo" />;
  }

  if ((spec.view === "stacked" || spec.view === "donut") && chart.length > 0) {
    const slices: Slice[] = chart.map((one, i) => ({
      key: one.key,
      label: one.label,
      value: one.value,
      hue: RING_HUES[i % RING_HUES.length]!,
    }));
    return spec.view === "stacked" ? (
      <Stacked slices={slices} />
    ) : (
      <Donut
        slices={slices}
        total={slices.reduce((all, one) => all + one.value, 0)}
        totalLabel={t("report.measure.value")}
      />
    );
  }

  if ((spec.view === "line" || spec.view === "area") && chart.length > 0) {
    // Along its own order rather than by size, because a line is read as time.
    const points = [...chart].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }));
    return <Line points={points} hue="indigo" filled={spec.view === "area"} />;
  }

  // The tallest number in each column, so a cell can be drawn against it.
  const tallest = result.columns.map((column, c) =>
    column.kind === "number"
      ? Math.max(0, ...result.rows.map((row) => Number(row[c] ?? 0) || 0))
      : 0,
  );

  return (
    <div className="overflow-x-auto">
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
