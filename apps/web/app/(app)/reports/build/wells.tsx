"use client";

import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@connectapp/ui";
import {
  AGGREGATIONS, SPLIT_VIEWS, GROUPED_VIEWS, SUBJECTS, fieldOf,
  type Aggregation, type ReportTile, type ValueWell,
} from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import { Shelf, type Pill } from "./shelf";

/** What a value in the well is called on its pill. */
export function wellName(one: ValueWell, tile: ReportTile): string {
  if (!one.field) {
    return one.agg === "distinct"
      ? t("report.measure.members")
      : t("report.countOfRows", { rows: t(SUBJECTS[tile.subject].rowLabel as never) });
  }
  return t("report.aggOf", {
    agg: t(`report.agg.${one.agg}` as never),
    field: t(fieldOf(tile.subject, one.field)!.label as never),
  });
}

/**
 * R18.12. The wells for the visual that is selected.
 *
 * Axis, Legend and Values, which is the vocabulary every tool of this kind
 * settled on. A field dropped in Values keeps its own aggregation on its own
 * pill, so changing Sum to Average is done where the field is rather than in a
 * separate control somewhere else.
 */
export function Wells({
  tile,
  onChange,
}: {
  tile: ReportTile;
  onChange: (patch: Partial<ReportTile>) => void;
}) {
  const def = SUBJECTS[tile.subject];
  const counted = Boolean(tile.groupBy);

  const axisField = tile.groupBy ? fieldOf(tile.subject, tile.groupBy) : null;
  const splitField = tile.splitBy ? fieldOf(tile.subject, tile.splitBy) : null;

  const axisPills: Pill[] = axisField
    ? [{ key: axisField.key, label: t(axisField.label as never) }]
    : [];
  const splitPills: Pill[] = splitField
    ? [{ key: splitField.key, label: t(splitField.label as never) }]
    : [];
  const valuePills: Pill[] = tile.values.map((one, i) => ({
    key: `${one.field ?? "rows"}-${i}`,
    label: wellName(one, tile),
  }));

  return (
    <div className="flex flex-col gap-3">
      {tile.view === "table" ? (
        <Shelf
          title={t("report.columns")}
          empty={t("report.dropHere")}
          pills={tile.columns.map((key) => ({
            key,
            label: t(fieldOf(tile.subject, key)!.label as never),
          }))}
          takes={(key) => !tile.columns.includes(key)}
          onDrop={(key) => onChange({ columns: [...tile.columns, key] })}
          onRemove={(key) => onChange({ columns: tile.columns.filter((one) => one !== key) })}
        />
      ) : (
        <>
          <Shelf
            title={t("report.shelf.axis")}
            empty={t("report.dropDimension")}
            pills={axisPills}
            takes={(key) => Boolean(fieldOf(tile.subject, key)?.groupable)}
            onDrop={(key) =>
              onChange({
                groupBy: key,
                view: GROUPED_VIEWS.has(tile.view) ? tile.view : "bar",
              })}
            onRemove={() => onChange({ groupBy: null, splitBy: null, view: "table" })}
          />

          <Shelf
            title={t("report.shelf.legend")}
            empty={
              !counted
                ? t("report.valuesNeedGroup")
                : SPLIT_VIEWS.has(tile.view)
                  ? t("report.dropDimension")
                  : t("report.legendNeedsBar")
            }
            pills={splitPills}
            takes={(key) =>
              counted
              && SPLIT_VIEWS.has(tile.view)
              && key !== tile.groupBy
              && Boolean(fieldOf(tile.subject, key)?.groupable)}
            onDrop={(key) => onChange({ splitBy: key })}
            onRemove={() => onChange({ splitBy: null })}
          />
        </>
      )}

      <Shelf
        title={t("report.shelf.values")}
        empty={
          tile.view === "table"
            ? t("report.valuesNeedChart")
            : t("report.countingRows", {
                rows: t(def.rowLabel as never),
              })
        }
        pills={valuePills}
        takes={() => tile.view !== "table" && tile.values.length === 0}
        onDrop={(key) => {
          const field = fieldOf(tile.subject, key);
          onChange({ values: [{ agg: field?.numeric ? "sum" : "count", field: key }] });
        }}
        onRemove={() => onChange({ values: [] })}
      >
        {/* The aggregation lives on the value it applies to. */}
        {tile.values[0]?.field ? (
          <Select
            value={tile.values[0].agg}
            onValueChange={(value) =>
              onChange({ values: [{ ...tile.values[0]!, agg: value as Aggregation }] })}
          >
            <SelectTrigger className="min-h-8 text-[13px]" aria-label={t("report.aggregation")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGGREGATIONS.filter(
                (agg) =>
                  (agg !== "sum" && agg !== "average")
                  || fieldOf(tile.subject, tile.values[0]!.field!)?.numeric,
              ).map((agg) => (
                <SelectItem key={agg} value={agg}>{t(`report.agg.${agg}` as never)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : tile.view !== "table" && tile.values.length === 0 ? (
          <button
            type="button"
            onClick={() => onChange({ values: [{ agg: "distinct" }] })}
            className="cursor-pointer self-start rounded-full border border-line-strong px-2.5 py-0.5 text-[12px] font-medium text-fg-muted hover:bg-sunken"
          >
            {t("report.measure.members")}
          </button>
        ) : null}
      </Shelf>
    </div>
  );
}
