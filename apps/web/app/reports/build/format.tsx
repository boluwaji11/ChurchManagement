"use client";

import * as React from "react";
import { Switch, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@hearth/ui";
import {
  CHART_HUES, CHART_SORTS, GROUPED_VIEWS, SPLIT_VIEWS,
  type ChartHue, type ChartSort, type ReportLook, type ReportTile,
} from "@hearth/db/rules";
import { t } from "@hearth/i18n";

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
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[13px] text-fg">
      <span className="min-w-0 flex-1">{label}</span>
      <Switch checked={on} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

/**
 * R18.12. How the selected visual looks, as against what it says.
 *
 * Kept apart from the fields on purpose, the way every tool of this kind keeps
 * them apart: nobody hunting for a colour should have to read past a field
 * list to find it, and nobody changing what is counted should trip over the
 * gridlines.
 */
export function Format({
  tile,
  onChange,
}: {
  tile: ReportTile;
  onChange: (patch: Partial<ReportTile>) => void;
}) {
  const look = tile.look;
  const set = (patch: Partial<ReportLook>) => onChange({ look: { ...look, ...patch } });

  const charted = GROUPED_VIEWS.has(tile.view);
  const seriesed = SPLIT_VIEWS.has(tile.view) && Boolean(tile.splitBy);

  return (
    <div className="flex flex-col gap-4">
      {/* The colour. A series chart takes the spectrum in order, so this is
          the one colour only where there is one. */}
      {charted ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
            {t("report.format.colour")}
          </h4>

          {seriesed ? (
            <p className="text-[12px] text-fg-muted">{t("report.format.seriesColour")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {CHART_HUES.map((hue) => (
                <button
                  key={hue}
                  type="button"
                  onClick={() => set({ hue: hue as ChartHue })}
                  aria-pressed={look.hue === hue}
                  aria-label={t(`hue.${hue}` as never)}
                  title={t(`hue.${hue}` as never)}
                  className={
                    look.hue === hue
                      ? "size-7 cursor-pointer rounded-full ring-2 ring-fg ring-offset-2 ring-offset-surface"
                      : "size-7 cursor-pointer rounded-full"
                  }
                  style={{ background: `var(--hue-${hue}-500)` }}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Only what this visual can be told. A pane that lists what does not
          apply and says so is a pane nobody reads twice. */}
      {charted ? (
        <section className="flex flex-col gap-2.5">
          <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
            {t("report.format.onThePlot")}
          </h4>

          <Toggle
            label={t("report.format.labels")}
            on={look.labels}
            onChange={(on) => set({ labels: on })}
          />
          <Toggle
            label={t("report.format.grid")}
            on={look.grid}
            onChange={(on) => set({ grid: on })}
          />
          <Toggle
            label={t("report.format.legend")}
            on={look.legend}
            onChange={(on) => set({ legend: on })}
          />
        </section>
      ) : null}

      {/* A table and a single value have a total too. */}
      {tile.groupBy || tile.view === "table" ? (
        <section className="flex flex-col gap-2.5">
          <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
            {t("report.format.summary")}
          </h4>
          <Toggle
            label={t("report.totals")}
            on={tile.totals}
            onChange={(on) => onChange({ totals: on })}
          />
        </section>
      ) : null}

      {charted ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
            {t("report.format.order")}
          </h4>

          <Select
            value={look.sort}
            onValueChange={(value) => set({ sort: value as ChartSort })}
          >
            <SelectTrigger className="min-h-8 text-[13px]" aria-label={t("report.format.order")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_SORTS.map((one) => (
                <SelectItem key={one} value={one}>
                  {t(`report.format.sort.${one}` as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={look.dir} onValueChange={(value) => set({ dir: value as "asc" | "desc" })}>
            <SelectTrigger className="min-h-8 text-[13px]" aria-label={t("report.order")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">{t("report.order.desc")}</SelectItem>
              <SelectItem value="asc">{t("report.order.asc")}</SelectItem>
            </SelectContent>
          </Select>
        </section>
      ) : null}
    </div>
  );
}
