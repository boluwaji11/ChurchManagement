"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Spinner,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R13.18. Which year's statements to read.
 *
 * A row of three buttons reached the last three years and nothing before
 * them, so a treasurer asked for 2021 had nowhere to press. This is every
 * year the church has taken a gift in.
 *
 * R24.6. Choosing a year fetches the whole screen again, so the control holds
 * itself shut until the rows land and marks the wait beside itself. The mark
 * fades in after a moment, so a year the server answers for at once flashes
 * nothing.
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
  const [busy, startReading] = React.useTransition();

  return (
    <div className="flex items-center gap-2" aria-busy={busy}>
      <Select
        value={year}
        disabled={busy}
        onValueChange={(next) =>
          startReading(() => {
            router.push(`/giving/statements?church=${church}&year=${next}`);
          })
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

      {busy ? (
        <Spinner
          label={t("common.opening")}
          className="opacity-0 [animation:connectapp-fade_var(--duration-fast)_var(--ease-out)_200ms_forwards]"
        />
      ) : null}
    </div>
  );
}
