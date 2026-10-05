"use client";

import * as React from "react";
import {
  Switch, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import {
  AXIS_WAYS, CHART_HUES, CHART_SORTS, GROUPED_VIEWS, LABEL_KINDS, LEGEND_SPOTS, PAGE_SIZES,
  SPLIT_VIEWS,
  type AxisWay, type ChartHue, type ChartSort, type LabelKind, type LegendSpot,
  type ReportLook, type ReportTile,
} from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import type { Part } from "../plot";

/** Everything in here is set at the size the field list is read at. */
const SMALL = "text-[13px]";

/** One switch and what it turns on. */
function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-3 text-fg ${SMALL}`}>
      <span className="min-w-0 flex-1">{label}</span>
      <Switch checked={on} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

/** One named group of settings, marked when the visual sent us here. */
function Section({
  title,
  lit,
  children,
}: {
  title: string;
  lit?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        lit
          ? "-mx-2 flex flex-col gap-2 rounded-[10px] bg-primary-soft px-2 py-2"
          : "-mx-2 flex flex-col gap-2 px-2 py-2"
      }
    >
      <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
        {title}
      </h4>
      {children}
    </section>
  );
}

/** A labelled control, at the size the rest of the pane is read at. */
function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-fg-muted ${SMALL}`}>{label}</span>
      {children}
    </div>
  );
}

/** A select at the pane's own size, which every one of these is. */
function Pick<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Line label={label}>
      <Select value={value} onValueChange={(one) => onChange(one as T)}>
        <SelectTrigger className={`min-h-8 ${SMALL}`} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((one) => (
            <SelectItem key={one.value} value={one.value}>{one.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Line>
  );
}

/** The spectrum as nine swatches, one of them chosen. */
function Swatches({
  value,
  onChange,
}: {
  value: ChartHue;
  onChange: (hue: ChartHue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CHART_HUES.map((hue) => (
        <button
          key={hue}
          type="button"
          onClick={() => onChange(hue)}
          aria-pressed={value === hue}
          aria-label={t(`hue.${hue}` as never)}
          title={t(`hue.${hue}` as never)}
          className={
            value === hue
              ? "size-5 cursor-pointer rounded-full ring-2 ring-fg ring-offset-2 ring-offset-surface"
              : "size-5 cursor-pointer rounded-full"
          }
          style={{ background: `var(--hue-${hue}-500)` }}
        />
      ))}
    </div>
  );
}

/**
 * R18.12. How the selected visual looks, as against what it says.
 *
 * Kept apart from the fields on purpose, the way every tool of this kind keeps
 * them apart: nobody hunting for a colour should have to read past a field
 * list to find it, and nobody changing what is counted should trip over the
 * gridlines. Each section is drawn only where the selected visual can use it,
 * and pressing a piece of the visual on the canvas lights the section that
 * sets it.
 */
export function Format({
  tile,
  series,
  part,
  onChange,
}: {
  tile: ReportTile;
  /** What the legend values came back as, so each gets its own swatch. */
  series: string[];
  /** The piece of the visual that was pressed, if any. */
  part: Part | null;
  onChange: (patch: Partial<ReportTile>) => void;
}) {
  const look = tile.look;
  const set = (patch: Partial<ReportLook>) => onChange({ look: { ...look, ...patch } });

  const charted = GROUPED_VIEWS.has(tile.view);
  const split = SPLIT_VIEWS.has(tile.view) && Boolean(tile.splitBy);
  // A ring and a split bar colour one shape per answer. Everything else is one
  // colour for the whole series.
  const many = split || tile.view === "donut" || tile.view === "stacked";
  const framed = tile.view === "bar" || tile.view === "stacked" || tile.view === "line"
    || tile.view === "area";
  const way: AxisWay = tile.view === "rows" ? "horizontal" : "vertical";

  const hueAt = (i: number): ChartHue => look.hues[i] ?? look.hue;
  const setHueAt = (i: number, hue: ChartHue) => {
    const next = [...look.hues];
    while (next.length <= i) next.push(look.hue);
    next[i] = hue;
    set({ hues: next });
  };

  return (
    <div className="flex flex-col divide-y divide-line">
      {charted ? (
        <Section title={t("report.format.colour")} lit={part === "colour"}>
          {many && series.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {series.slice(0, 12).map((name, i) => (
                <li key={name + i} className="flex flex-col gap-1">
                  <span className={`truncate text-fg ${SMALL}`} title={name}>{name}</span>
                  <Swatches value={hueAt(i)} onChange={(hue) => setHueAt(i, hue)} />
                </li>
              ))}
            </ul>
          ) : (
            <Swatches
              value={look.hues[0] ?? look.hue}
              onChange={(hue) => set({ hue, hues: [hue] })}
            />
          )}
        </Section>
      ) : null}

      {charted ? (
        <Section title={t("report.format.labels")} lit={part === "labels"}>
          <Toggle
            label={t("report.format.showLabels")}
            on={look.labels}
            onChange={(on) => set({ labels: on })}
          />
          {look.labels ? (
            <Pick<LabelKind>
              label={t("report.format.labelKind")}
              value={look.labelKind}
              onChange={(labelKind) => set({ labelKind })}
              options={LABEL_KINDS.map((one) => ({
                value: one,
                label: t(`report.format.labelKind.${one}` as never),
              }))}
            />
          ) : null}
        </Section>
      ) : null}

      {charted ? (
        <Section title={t("report.format.legend")} lit={part === "legend"}>
          <Toggle
            label={t("report.format.showLegend")}
            on={look.legend}
            onChange={(on) => set({ legend: on })}
          />
          {look.legend ? (
            <Pick<LegendSpot>
              label={t("report.format.legendAt")}
              value={look.legendAt}
              onChange={(legendAt) => set({ legendAt })}
              options={LEGEND_SPOTS.map((one) => ({
                value: one,
                label: t(`report.format.at.${one}` as never),
              }))}
            />
          ) : null}
        </Section>
      ) : null}

      {/* One axis carries the answers and runs along the x or the y, which is
          what the orientation picks. */}
      {charted && tile.view !== "donut" ? (
        <Section title={t("report.format.axis")} lit={part === "axis"}>
          {tile.view === "bar" || tile.view === "rows" ? (
            <Pick<AxisWay>
              label={t("report.format.way")}
              value={way}
              onChange={(next) => onChange({ view: next === "horizontal" ? "rows" : "bar" })}
              options={AXIS_WAYS.map((one) => ({
                value: one,
                label: t(`report.format.way.${one}` as never),
              }))}
            />
          ) : null}

          {framed ? (
            <>
              <Toggle
                label={t("report.format.valueAxis")}
                on={look.valueAxis}
                onChange={(on) => set({ valueAxis: on })}
              />
              <Toggle
                label={t("report.format.grid")}
                on={look.grid}
                onChange={(on) => set({ grid: on })}
              />
              <Line label={t("report.format.valueTitle")}>
                <Input
                  value={look.valueTitle}
                  onChange={(e) => set({ valueTitle: e.target.value })}
                  aria-label={t("report.format.valueTitle")}
                  className={`min-h-8 ${SMALL}`}
                />
              </Line>
              <Line label={t("report.format.categoryTitle")}>
                <Input
                  value={look.categoryTitle}
                  onChange={(e) => set({ categoryTitle: e.target.value })}
                  aria-label={t("report.format.categoryTitle")}
                  className={`min-h-8 ${SMALL}`}
                />
              </Line>
            </>
          ) : null}
        </Section>
      ) : null}

      {/* A list of six hundred members is unreadable in a tile, so how many
          rows a page holds is set here and kept with the report. */}
      {tile.view === "table" ? (
        <Section title={t("report.format.rows")}>
          <Pick<string>
            label={t("report.format.perPage.label")}
            value={look.perPage === null ? "all" : String(look.perPage)}
            onChange={(value) => set({ perPage: value === "all" ? null : Number(value) })}
            options={[
              ...PAGE_SIZES.map((one) => ({
                value: String(one),
                label: t("report.format.perPage", { count: String(one) }),
              })),
              { value: "all", label: t("report.format.allRows") },
            ]}
          />
        </Section>
      ) : null}

      {/* A table and a single value have a total too. */}
      {tile.groupBy || tile.view === "table" ? (
        <Section title={t("report.format.summary")}>
          <Toggle
            label={t("report.totals")}
            on={tile.totals}
            onChange={(on) => onChange({ totals: on })}
          />
        </Section>
      ) : null}

      {charted ? (
        <Section title={t("report.format.order")}>
          <Pick<ChartSort>
            label={t("report.format.sortBy")}
            value={look.sort}
            onChange={(sort) => set({ sort })}
            options={CHART_SORTS.map((one) => ({
              value: one,
              label: t(`report.format.sort.${one}` as never),
            }))}
          />
          <Pick<"asc" | "desc">
            label={t("report.order")}
            value={look.dir}
            onChange={(dir) => set({ dir })}
            options={[
              { value: "desc", label: t("report.order.desc") },
              { value: "asc", label: t("report.order.asc") },
            ]}
          />
        </Section>
      ) : null}
    </div>
  );
}
