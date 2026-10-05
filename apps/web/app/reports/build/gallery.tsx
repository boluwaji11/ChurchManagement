"use client";

import * as React from "react";
import {
  AlignHorizontalDistributeCenter, BarChart3, ChartArea, ChartColumnBig, ChartLine, ChartPie,
  Hash, Table2,
} from "lucide-react";
import { VIEWS, VIEW_NEEDS, viewFits, type View } from "@hearth/db/rules";
import { t } from "@hearth/i18n";

const ICONS: Record<View, React.ComponentType<{ className?: string }>> = {
  table: Table2,
  number: Hash,
  bar: ChartColumnBig,
  rows: BarChart3,
  stacked: AlignHorizontalDistributeCenter,
  donut: ChartPie,
  line: ChartLine,
  area: ChartArea,
};

/**
 * R18.12. Every way the answer can be drawn, as a gallery.
 *
 * All six are always on screen, including the ones this report cannot use yet.
 * A gallery that hides what does not fit teaches nobody what the tool can do,
 * and the one thing somebody wants to know is what it would take to draw the
 * chart they are looking at. So a chart that needs a grouping says so, and
 * choosing it is what tells them.
 */
export function Gallery({
  view,
  groupBy,
  answers,
  onPick,
}: {
  view: View;
  groupBy: string | null;
  /** How many answers the report came back with, for the readability note. */
  answers: number;
  onPick: (view: View) => void;
}) {
  const needs = VIEW_NEEDS[view];
  const crowded = Boolean(needs.readableUpTo && answers > needs.readableUpTo);

  return (
    <section className="flex w-full shrink-0 flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 lg:w-[232px]">
      <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
        {t("report.step.view")}
      </h4>

      <div className="grid grid-cols-4 gap-1.5">
        {VIEWS.map((one) => {
          const Icon = ICONS[one];
          const fits = viewFits(one, { groupBy });
          const on = view === one;
          return (
            <button
              key={one}
              type="button"
              onClick={() => onPick(one)}
              aria-pressed={on}
              title={
                fits
                  ? t(`report.view.${one}` as never)
                  : `${t(`report.view.${one}` as never)} · ${t("report.needsGroup")}`
              }
              className={
                on
                  ? "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-primary bg-primary text-primary-fg"
                  : fits
                    ? "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-line-strong bg-surface text-fg hover:bg-sunken"
                    : "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-line text-fg-subtle hover:bg-sunken"
              }
            >
              <Icon className="size-4" />
              <span className="px-1 text-center text-[10px] leading-3">
                {t(`report.view.${one}` as never)}
              </span>
            </button>
          );
        })}
      </div>

      {/* What this choice needs, said where the choice was made. */}
      {!viewFits(view, { groupBy }) ? (
        <p className="text-[12px] text-fg-muted">{t("report.needsGroup")}</p>
      ) : crowded ? (
        <p className="text-[12px] text-fg-muted">
          {t("report.tooMany", {
            shown: String(needs.readableUpTo),
            answers: String(answers),
          })}
        </p>
      ) : null}
    </section>
  );
}
