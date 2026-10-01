"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * R7.1. One month at a time.
 *
 * The list used to be every service the church had ever held or scheduled,
 * which is fine in week one and thousands of rows in year three. A month is the
 * unit a church already thinks in, it bounds the page without anybody choosing
 * a page size, and it is the same navigation a calendar has.
 *
 * Back, here, forward. The middle returns to this month, and it is a dot
 * because the two arrows beside it already say what it is for.
 */
export function MonthBar({
  church,
  month,
  label,
  previous,
  next,
  isThisMonth,
  view,
}: {
  church: string;
  month: string;
  label: string;
  previous: string;
  next: string;
  isThisMonth: boolean;
  view: string;
}) {
  const href = (m: string) => `/services?church=${church}&month=${m}&view=${view}`;

  const step =
    "flex min-h-[var(--d-tap)] items-center justify-center px-3 text-fg-muted " +
    "transition-colors duration-instant ease-out hover:bg-sunken hover:text-fg";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-heading text-fg">{label}</span>

      <div
        className={cn(
          "inline-flex items-center divide-x divide-line overflow-hidden",
          "rounded-[var(--d-radius-control)] border border-line-strong bg-surface",
        )}
      >
        <Link href={href(previous)} aria-label={t("services.month.previous")} className={step}>
          <ChevronLeft className="size-4" aria-hidden />
        </Link>

        <Link
          href={`/services?church=${church}&view=${view}`}
          aria-current={isThisMonth ? "page" : undefined}
          className={cn(step, isThisMonth && "text-primary")}
        >
          {t("services.month.today")}
        </Link>

        <Link href={href(next)} aria-label={t("services.month.next")} className={step}>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <span className="sr-only">{month}</span>
    </div>
  );
}
