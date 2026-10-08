"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R13.19, R17.4. A giver's own statement, for whichever year they want it.
 *
 * It was a link to this year and nothing else, which is wrong in the one
 * month it matters: somebody doing their taxes in April is asking for last
 * year, and a church secretary should not be the way they get it.
 */
export function MyStatement({
  church,
  years,
  thisYear,
}: {
  church: string;
  /** Newest first. Every year this person has actually given in. */
  years: string[];
  thisYear: string;
}) {
  const [year, setYear] = React.useState(years.includes(thisYear) ? thisYear : years[0] ?? thisYear);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
      <Select value={year} onValueChange={setYear}>
        <SelectTrigger aria-label={t("statement.year")} className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((one) => (
            <SelectItem key={one} value={one}>{one}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <a
        href={`/giving/statement?church=${church}&year=${year}`}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--d-radius-control)] px-2 font-medium text-primary underline underline-offset-4 hover:bg-sunken [&_svg]:size-4"
      >
        <Download aria-hidden /> {t("mine.giving.statementFor", { year })}
      </a>
    </div>
  );
}
