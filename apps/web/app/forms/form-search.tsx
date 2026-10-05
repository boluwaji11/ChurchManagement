"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * R4.1. Finding a form by name.
 *
 * Filtered here rather than on the server, because a church has tens of forms
 * and not thousands, and a round trip per keystroke to narrow a list already on
 * the screen is work nobody asked for. It hides itself on a short list, where
 * reading the tiles is faster than reaching for a box.
 */
const SEARCHABLE_FROM = 6;

export function FormSearch({
  children,
  names,
  count,
}: {
  /** One tile per form, in the same order as `names`. */
  children: React.ReactNode[];
  names: string[];
  count: number;
}) {
  const [query, setQuery] = React.useState("");
  const text = query.trim().toLowerCase();

  const shown = React.Children.toArray(children).filter((_, at) =>
    text ? (names[at] ?? "").toLowerCase().includes(text) : true,
  );

  return (
    <div className="flex flex-col gap-4">
      {count >= SEARCHABLE_FROM ? (
        <label className="relative flex max-w-[360px] items-center">
          <Search
            className="pointer-events-none absolute left-3 size-4 text-fg-subtle"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("common.search")}
            placeholder={t("common.search")}
            autoComplete="off"
            className="pl-9"
          />
        </label>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("common.noMatch")}</p>
      ) : (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {shown}
        </ul>
      )}
    </div>
  );
}
