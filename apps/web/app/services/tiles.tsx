"use client";

import * as React from "react";
import { Badge, Card, cn } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import type { GatheringRow } from "./calendar";

/**
 * R7.1. The month as tiles.
 *
 * One card a service, which is what a phone wants and what a wall display can
 * be read from. The same actions as the row.
 */
export function Tiles({
  rows,
  actions,
}: {
  rows: GatheringRow[];
  actions: (row: GatheringRow) => React.ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => {
        const cancelled = row.status === "cancelled";
        return (
          <Card key={row.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate text-title",
                    cancelled ? "text-fg-subtle line-through" : "text-fg",
                  )}
                >
                  {row.name}
                </div>
                <div className="text-label text-fg-muted">
                  {row.readableDate}, {row.readableTime}
                </div>
              </div>
              <Badge tone={cancelled ? "warning" : row.past ? "success" : "neutral"}>
                {cancelled
                  ? t("services.status.cancelled")
                  : row.past
                    ? t("services.status.held")
                    : t("services.status.upcoming")}
              </Badge>
            </div>

            {cancelled ? null : (
              <div className="text-[length:var(--d-text-body)]">
                {row.total !== null ? (
                  <span className="text-fg">{row.total}</span>
                ) : row.present > 0 ? (
                  <span className="text-fg">{plural("roster.present", row.present)}</span>
                ) : (
                  <span className="text-fg-subtle">{t("services.notCounted")}</span>
                )}
              </div>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-1">{actions(row)}</div>
          </Card>
        );
      })}
    </div>
  );
}
