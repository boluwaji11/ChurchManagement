"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@hearth/ui";
import { t } from "@hearth/i18n";

/** One band of the screen: published, draft, cancelled, or what has been. */
export interface EventSection {
  key: string;
  heading: string;
  items: { id: string; name: string; card: React.ReactNode }[];
}

/**
 * R14.1. Finding an event by name, across the bands it is sorted into.
 *
 * Filtered here rather than on the server, for the same reason the forms list
 * is: a church has tens of events, and a round trip per keystroke to narrow a
 * list already on the screen is work nobody asked for.
 */
export function EventSearch({
  sections,
  count,
  action,
}: {
  sections: EventSection[];
  count: number;
  /** The screen's one action, which shares the line with the search. */
  action?: React.ReactNode;
}) {
  const [query, setQuery] = React.useState("");
  const text = query.trim().toLowerCase();

  const shown = sections
    .map((section) => ({
      ...section,
      items: text
        ? section.items.filter((one) => one.name.toLowerCase().includes(text))
        : section.items,
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* The search leads, the action sits at the far end. */}
      <div className="flex flex-wrap items-center gap-3">
        {count > 1 ? (
          <label className="relative flex max-w-[360px] min-w-[200px] items-center">
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
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>

      {shown.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("common.noMatch")}</p>
      ) : (
        shown.map((section, at) => (
          <section
            key={section.key}
            /* A hairline between bands, so published and draft read as two
               lists rather than one list with a word in the middle. */
            className={
              at === 0
                ? "flex flex-col gap-3.5"
                : "flex flex-col gap-3.5 border-t border-line pt-6"
            }
          >
            <h2 className="text-[13px] font-bold tracking-wide text-fg uppercase">
              {section.heading}
            </h2>
            <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
              {section.items.map((one) => (
                <li key={one.id} className="contents">
                  {one.card}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
