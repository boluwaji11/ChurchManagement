"use client";

import * as React from "react";
import { Table, Thead, Tr, Th, Td } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Pages } from "@/components/pages";
import { read } from "./read";

/**
 * R18.12. A built report's list, a page at a time.
 *
 * How many rows a page holds is part of the report, set where it was built, so
 * a list of six services and a list of six hundred members are read the same
 * way. With paging off, the whole list is there and the tile scrolls.
 */
export function Rows({
  columns,
  rows,
  perPage,
  fill = false,
}: {
  columns: { key: string; label: string; kind: string }[];
  rows: string[][];
  perPage: number | null;
  fill?: boolean;
}) {
  const [page, setPage] = React.useState(1);

  // A shorter page than the one that was set, after a filter cut the list down.
  const size = perPage ?? rows.length ?? 1;
  const last = Math.max(1, Math.ceil(rows.length / Math.max(1, size)));
  const at = Math.min(page, last);
  const first = (at - 1) * size;
  const shown = perPage === null ? rows : rows.slice(first, first + size);

  // The tallest number in each column, so a cell can be drawn against it.
  const tallest = columns.map((column, c) =>
    column.kind === "number"
      ? Math.max(0, ...rows.map((row) => Number(row[c] ?? 0) || 0))
      : 0,
  );

  return (
    <div className={fill ? "flex min-h-0 flex-1 flex-col gap-2" : "flex flex-col gap-2"}>
      <div className={fill ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto"}>
        <Table>
          <Thead>
            <Tr>
              {columns.map((one) => (
                <Th key={one.key}>{t(one.label as never)}</Th>
              ))}
            </Tr>
          </Thead>
          <tbody>
            {shown.map((row, i) => (
              <Tr key={first + i}>
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

      {/* The control goes where there is more than one page of anything. */}
      {perPage !== null && rows.length > perPage ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-fg-muted">
            {t("pages.range", {
              first: String(first + 1),
              upto: String(Math.min(first + size, rows.length)),
              matching: String(rows.length),
            })}
          </span>
          <Pages page={at} last={last} onPage={setPage} />
        </div>
      ) : null}
    </div>
  );
}
