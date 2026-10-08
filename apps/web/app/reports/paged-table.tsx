"use client";

import * as React from "react";
import Link from "next/link";
import { Thead, Tr, Th, Td } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Pages } from "@/components/pages";
import { ResizableTable } from "@/components/resizable-columns";

export interface Cell {
  text: string;
  /** A keyed dot before the text, where the row stands for something coloured. */
  hue?: string;
  /** Tinted, for a status that is worth seeing at a glance. */
  pill?: string;
  muted?: boolean;
  numeric?: boolean;
}

export interface Row {
  key: string;
  /** Where the row opens, where it stands for something with a page. */
  href?: string;
  cells: Cell[];
}

/** How many rows a report shows before it asks. */
const PER_PAGE = 10;

/**
 * R18.x, R2.14. A report's list, ten at a time.
 *
 * A church with four services does not need this and a church with a year of
 * them cannot read the screen without it, so every report's list gets it and
 * the control disappears where there is only one page.
 */
export function PagedTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Row[];
}) {
  const [page, setPage] = React.useState(1);

  const last = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const at = Math.min(page, last);
  const first = (at - 1) * PER_PAGE;
  const shown = rows.slice(first, first + PER_PAGE);

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
      <h3 className="font-display text-[22px] leading-7 text-fg">{title}</h3>

      <div className="overflow-x-auto">
        <ResizableTable id="report-rows" className="rounded-lg border border-line bg-surface">
          <table className="w-full text-[length:var(--d-text-body)]">
          <Thead>
            <Tr>
              {columns.map((one) => (
                <Th key={one}>{one}</Th>
              ))}
            </Tr>
          </Thead>
          <tbody>
            {shown.map((row) => (
              <Tr key={row.key}>
                {row.cells.map((cell, i) => (
                  <Td
                    key={i}
                    className={
                      cell.numeric
                        ? "tabular-nums " + (cell.muted ? "text-fg-muted" : "text-fg")
                        : cell.muted
                          ? "text-fg-muted"
                          : "font-medium text-fg"
                    }
                  >
                    <span className="flex items-center gap-2">
                      {cell.hue ? (
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: `var(--hue-${cell.hue}-500)` }}
                        />
                      ) : null}

                      {cell.pill ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium"
                          style={{
                            background: `var(--hue-${cell.pill}-tint)`,
                            color: `var(--hue-${cell.pill}-key)`,
                          }}
                        >
                          {cell.text}
                        </span>
                      ) : i === 0 && row.href ? (
                        <Link href={row.href} className="truncate hover:text-primary">
                          {cell.text}
                        </Link>
                      ) : (
                        <span className="truncate">{cell.text}</span>
                      )}
                    </span>
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
          </table>
        </ResizableTable>
      </div>

      {rows.length > PER_PAGE ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-fg-muted">
            {t("reports.showing", {
              range: t("pages.range", {
                shown: String(Math.min(first + PER_PAGE, rows.length) - first),
                matching: String(rows.length),
              }),
            })}
          </span>
          <Pages page={at} last={last} onPage={setPage} />
        </div>
      ) : null}
    </section>
  );
}
