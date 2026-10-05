"use client";

import * as React from "react";
import { t } from "@hearth/i18n";
import {
  SortMenu, ViewToggle, ShowMore, useListPreference, useShowMore, type ListView,
} from "@/components/list-controls";
import { SearchField } from "@/components/search-field";

/** One band of the screen: published, draft, cancelled, or what has been. */
export interface EventSection {
  key: string;
  heading: string;
  items: {
    id: string;
    name: string;
    /** R24.6. What the list is ordered by, when it is not ordered by name. */
    startsOn: string;
    createdAt: string;
    card: React.ReactNode;
    row: React.ReactNode;
  }[];
}

/** R24.6. The orders an events list is worth reading in. */
type Item = EventSection["items"][number];

/**
 * R24.6. The orders an events list is worth reading in.
 *
 * "draftsFirst" orders the bands rather than the rows: a church working
 * through a pile of half-written events wants that pile at the top of the
 * screen, with the published ones under it.
 */
type Order = "soonest" | "newest" | "name" | "draftsFirst";

const BY: Record<Order, (a: Item, b: Item) => number> = {
  soonest: (a, b) => a.startsOn.localeCompare(b.startsOn),
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  draftsFirst: (a, b) => a.startsOn.localeCompare(b.startsOn),
};

/** One band, which draws as much of itself as anybody has asked for. */
function Band({
  section,
  view,
  rule,
}: {
  section: EventSection;
  view: ListView;
  /** A hairline above, for every band after the first. */
  rule: boolean;
}) {
  const { limit, hidden, more } = useShowMore(section.items.length);
  const items = section.items.slice(0, limit);

  return (
    <section
      className={
        rule
          ? "flex flex-col gap-3.5 border-t border-line pt-6"
          : "flex flex-col gap-3.5"
      }
    >
      <h2 className="text-[13px] font-bold tracking-wide text-fg uppercase">
        {section.heading}
      </h2>

      {view === "tiles" ? (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {items.map((one) => (
            <li key={one.id} className="contents">{one.card}</li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
          {items.map((one) => (
            <li key={one.id} className="border-b border-line last:border-b-0">{one.row}</li>
          ))}
        </ul>
      )}

      <ShowMore hidden={hidden} onClick={more} />
    </section>
  );
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
  const [order, setOrder] = useListPreference<Order>("events.order", "soonest");
  const [view, setView] = useListPreference<ListView>("events.view", "tiles");
  const text = query.trim().toLowerCase();

  const shown = sections
    .map((section) => ({
      ...section,
      items: (text
        ? section.items.filter((one) => one.name.toLowerCase().includes(text))
        : section.items
      ).slice().sort(BY[order]),
    }))
    .filter((section) => section.items.length > 0);

  // Drafts to the top when that is what is being worked through, otherwise the
  // order the page handed over, which leads with what the congregation sees.
  const bands = order === "draftsFirst"
    ? [...shown].sort((a, b) => Number(b.key === "draft") - Number(a.key === "draft"))
    : shown;

  return (
    <div className="flex flex-col gap-6">
      {/* The search leads, the action sits at the far end. */}
      <div className="flex flex-wrap items-center gap-3">
        {count > 1 ? (
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("event.search")}
          />
        ) : null}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <SortMenu
            value={order}
            onChange={(next) => setOrder(next as Order)}
            options={[
              { value: "soonest", label: t("list.sort.soonest") },
              { value: "newest", label: t("list.sort.newest") },
              { value: "name", label: t("list.sort.name") },
              { value: "draftsFirst", label: t("list.sort.draftsFirst") },
            ]}
          />
          <ViewToggle value={view} onChange={setView} />
          {action}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("common.noMatch")}</p>
      ) : (
        bands.map((section, at) => (
          <Band key={section.key} section={section} view={view} rule={at > 0} />
        ))
      )}
    </div>
  );
}
