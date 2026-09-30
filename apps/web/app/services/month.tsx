"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * R7.1. One month at a time.
 *
 * The list used to be every service the church had ever held or scheduled,
 * which is fine in week one and thousands of rows in year three. A month is the
 * unit a church already thinks in, it bounds the page without anybody choosing
 * a page size, and it is the same navigation a calendar has.
 */
export function MonthBar({
  church,
  month,
  label,
  previous,
  next,
  isThisMonth,
}: {
  church: string;
  month: string;
  label: string;
  previous: string;
  next: string;
  isThisMonth: boolean;
}) {
  const href = (m: string) => `/services?church=${church}&month=${m}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" asChild aria-label={t("services.month.previous")}>
        <Link href={href(previous)}><ChevronLeft /></Link>
      </Button>

      <span className="min-w-44 text-center text-heading text-fg">{label}</span>

      <Button variant="ghost" asChild aria-label={t("services.month.next")}>
        <Link href={href(next)}><ChevronRight /></Link>
      </Button>

      {isThisMonth ? null : (
        <Button variant="ghost" asChild>
          <Link href={`/services?church=${church}`}>{t("services.month.today")}</Link>
        </Button>
      )}
      <span className="sr-only">{month}</span>
    </div>
  );
}
