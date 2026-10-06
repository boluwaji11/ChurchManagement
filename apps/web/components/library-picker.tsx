"use client";

import * as React from "react";
import { ChevronRight, Plus } from "lucide-react";
import { t } from "@connectapp/i18n";

export interface LibraryItem {
  key: string;
  label: string;
  /** The line under the name: what it holds, in the church's own words. */
  detail?: string;
}

/**
 * R24.6. The things a church was going to write down anyway, before the blank form.
 *
 * A panel that opens on an empty name box asks a volunteer to invent the
 * vocabulary of their own church on the spot. This offers what churches already
 * keep, and picking one fills the same form somebody would have typed, so it
 * stays a head start rather than a second kind of record.
 *
 * Writing your own leads, because somebody who knows what they want should not
 * read a list to reach the blank form.
 */
export function LibraryPicker({
  ownLabel,
  items,
  onOwn,
  onPick,
  limit = 8,
}: {
  ownLabel: string;
  items: LibraryItem[];
  onOwn: () => void;
  onPick: (item: LibraryItem) => void;
  /** How many are offered before the list says there are more. */
  limit?: number;
}) {
  const [all, setAll] = React.useState(false);
  const shown = all ? items : items.slice(0, limit);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onOwn}
        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-sunken"
      >
        <Plus className="size-[18px] shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 font-semibold text-fg">{ownLabel}</span>
        <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
      </button>

      {items.length === 0 ? null : (
        <>
          <hr className="my-2 border-0 border-t border-line" />

          <ol className="m-0 flex list-none flex-col p-0">
            {shown.map((item) => (
              <li key={item.key} className="flex gap-2.5">
                <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                  <span className="mt-4 size-2.5 shrink-0 rounded-full bg-primary" />
                  <span className="my-1 w-px flex-1 bg-primary/35" />
                </span>

                <button
                  type="button"
                  onClick={() => onPick(item)}
                  className="mb-1 flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-sunken"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-fg">{item.label}</span>
                    {item.detail ? (
                      <span className="truncate text-[12px] text-fg-subtle">{item.detail}</span>
                    ) : null}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                </button>
              </li>
            ))}
          </ol>

          {items.length > limit ? (
            <button
              type="button"
              onClick={() => setAll((was) => !was)}
              className="cursor-pointer self-start rounded-md px-2 py-2 font-medium text-primary"
            >
              {all ? t("list.showLess") : t("list.showMore", { count: items.length - limit })}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
