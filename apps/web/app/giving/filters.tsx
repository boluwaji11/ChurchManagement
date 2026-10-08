"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { t, plural } from "@connectapp/i18n";
import { FilterDrawer, FilterGroup, ChipButton } from "@/components/filter-drawer";
import {
  PERIODS, METHODS, STATES, type Narrowing, narrowingCount,
} from "./narrowing";

/**
 * The panel itself.
 *
 * Choosing anything sends the reader to a new address, which is also what
 * clears the pager: a narrowed list has its own first page, and leaving
 * somebody on page four of a list that now holds eleven rows is a blank
 * screen with no explanation.
 */
export function GivingFilters({
  church,
  now,
  funds,
  matching,
}: {
  church: string;
  now: Narrowing;
  funds: { id: string; name: string }[];
  /** How many gifts the current narrowing matches, for the foot. */
  matching: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.set("church", church);
    next.delete("gifts");
    next.delete("counts");
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <FilterDrawer
      title={t("giving.filter.title")}
      narrowing={narrowingCount(now)}
      onClear={() => go({ period: undefined, fund: undefined, how: undefined, state: undefined })}
      done={plural("giving.filter.done", matching)}
    >
      <FilterGroup label={t("giving.filter.period")}>
        {PERIODS.map((one) => (
          <ChipButton
            key={one}
            tone="ink"
            on={now.period === one}
            onClick={() => go({ period: one === "year" ? undefined : one })}
          >
            {t(`giving.filter.period.${one}` as never)}
          </ChipButton>
        ))}
      </FilterGroup>

      {funds.length > 0 ? (
        <FilterGroup label={t("giving.filter.fund")}>
          <ChipButton tone="ink" on={!now.fundId} onClick={() => go({ fund: undefined })}>
            {t("giving.filter.any")}
          </ChipButton>
          {funds.map((fund) => (
            <ChipButton
              key={fund.id}
              tone="ink"
              on={now.fundId === fund.id}
              onClick={() => go({ fund: now.fundId === fund.id ? undefined : fund.id })}
            >
              {fund.name}
            </ChipButton>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup label={t("giving.filter.method")}>
        <ChipButton tone="ink" on={!now.method} onClick={() => go({ how: undefined })}>
          {t("giving.filter.any")}
        </ChipButton>
        {METHODS.map((one) => (
          <ChipButton
            key={one}
            tone="ink"
            on={now.method === one}
            onClick={() => go({ how: now.method === one ? undefined : one })}
          >
            {t(`giving.method.${one}` as never)}
          </ChipButton>
        ))}
      </FilterGroup>

      <FilterGroup label={t("giving.filter.status")}>
        <ChipButton tone="ink" on={!now.status} onClick={() => go({ state: undefined })}>
          {t("giving.filter.any")}
        </ChipButton>
        {STATES.map((one) => (
          <ChipButton
            key={one}
            tone="ink"
            on={now.status === one}
            onClick={() => go({ state: now.status === one ? undefined : one })}
          >
            {t(`giving.filter.status.${one}` as never)}
          </ChipButton>
        ))}
      </FilterGroup>
    </FilterDrawer>
  );
}
