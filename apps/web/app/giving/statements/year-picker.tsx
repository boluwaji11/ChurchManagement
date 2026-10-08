"use client";

import { useRouter } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R13.18. Which year's statements to read.
 *
 * A row of three buttons reached the last three years and nothing before
 * them, so a treasurer asked for 2021 had nowhere to press. This is every
 * year the church has taken a gift in.
 */
export function YearPicker({
  church,
  year,
  years,
}: {
  church: string;
  year: string;
  /** Newest first, and always holding the year on screen. */
  years: string[];
}) {
  const router = useRouter();

  return (
    <Select
      value={year}
      onValueChange={(next) =>
        router.push(`/giving/statements?church=${church}&year=${next}`)
      }
    >
      <SelectTrigger aria-label={t("statement.year")} className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((one) => (
          <SelectItem key={one} value={one}>{one}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
