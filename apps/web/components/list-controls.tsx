"use client";

import * as React from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import {
  cn, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";

/** Tiles, or one row each. */
export type ListView = "tiles" | "list";

/**
 * R24.6. How a list is ordered and how it is drawn.
 *
 * The same pair over groups and over events, because a church that has learned
 * one of those screens has learned both. Kept in the browser's session rather
 * than written to the server: it is a preference about this sitting, and a
 * choice made on a borrowed laptop should not follow somebody home.
 */
export function useListPreference<T extends string>(key: string, fallback: T) {
  const [value, setValue] = React.useState<T>(fallback);

  React.useEffect(() => {
    try {
      const held = window.sessionStorage.getItem(key);
      if (held) setValue(held as T);
    } catch {
      // Private windows and blocked site data both throw. The fallback stands.
    }
  }, [key]);

  const set = React.useCallback((next: T) => {
    setValue(next);
    try {
      window.sessionStorage.setItem(key, next);
    } catch {
      // Nothing to do. The choice holds for this page either way.
    }
  }, [key]);

  return [value, set] as const;
}

/** The order a list is read in. */
export function SortMenu({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={t("list.sort")}
        className="h-[38px] min-h-0 w-auto min-w-[150px] text-[13px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((one) => (
          <SelectItem key={one.value} value={one.value}>
            {one.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Tiles or rows, drawn the way the services board already draws it. */
export function ViewToggle({
  value,
  onChange,
}: {
  value: ListView;
  onChange: (next: ListView) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-sunken p-[3px]">
      {([
        ["tiles", LayoutGrid],
        ["list", List],
      ] as const).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={cn(
            "flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-[13px] font-medium",
            value === key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {t(`services.view.${key}` as never)}
        </button>
      ))}
    </div>
  );
}

/**
 * R24.6. How many of a band are drawn before somebody asks for more.
 *
 * A church that has run events for five years has hundreds of them, and a
 * screen that draws all of them is a screen that takes a second to paint and a
 * minute to read. Twelve fills the grid three or four rows deep, which is as
 * far as anybody looks before they search instead.
 */
export const AT_FIRST = 12;

export function useShowMore(total: number, step = AT_FIRST) {
  const [limit, setLimit] = React.useState(step);

  // A search that narrows the list starts it again from the top, so pressing
  // "show more" four times does not leave a filtered list already expanded.
  React.useEffect(() => setLimit(step), [total, step]);

  return {
    limit,
    hidden: Math.max(0, total - limit),
    more: React.useCallback(() => setLimit((was) => was + step), [step]),
  };
}

/** The way to see the rest of a band. */
export function ShowMore({ hidden, onClick }: { hidden: number; onClick: () => void }) {
  if (hidden === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-1.5 self-start font-medium text-primary"
    >
      <Plus className="size-4" aria-hidden />
      {t("list.showMore", { count: hidden })}
    </button>
  );
}
