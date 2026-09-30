"use client";

import Link from "next/link";
import { CalendarDays, LayoutGrid, List } from "lucide-react";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { VIEWS, type View } from "./view";


const ICON = {
  list: List,
  calendar: CalendarDays,
  tiles: LayoutGrid,
};

/**
 * R7.1. How the month is drawn.
 *
 * A list reads fastest when somebody is working through what happened. A
 * calendar answers where the gaps are. Tiles are what a phone wants. The same
 * services, the same actions, three shapes, and the choice rides in the URL so
 * a bookmark keeps it.
 */
export function ViewBar({
  church,
  month,
  view,
}: {
  church: string;
  month: string;
  view: View;
}) {
  return (
    <div
      role="group"
      aria-label={t("services.view")}
      className="inline-flex rounded-[var(--d-radius-control)] border border-line-strong bg-surface p-0.5"
    >
      {VIEWS.map((option) => {
        const Icon = ICON[option];
        const current = option === view;
        return (
          <Link
            key={option}
            href={`/services?church=${church}&month=${month}&view=${option}`}
            aria-current={current ? "true" : undefined}
            className={cn(
              "flex min-h-[var(--d-tap)] items-center gap-2 rounded-[calc(var(--d-radius-control)-2px)] px-3",
              "text-label transition-colors duration-instant ease-out",
              current ? "bg-sunken text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(`services.view.${option}` as never)}
          </Link>
        );
      })}
    </div>
  );
}
