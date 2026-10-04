"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * R2.14, R24.6. Numbered pages, as the design has them.
 *
 * Arrows either side, the first and last page always reachable, an ellipsis
 * where the run is broken. Written once because a church counting people and a
 * church reading form responses are doing the same thing with the same control.
 */
export function Pages({
  page,
  last,
  onPage,
}: {
  page: number;
  last: number;
  /** Given the page wanted, 1 meaning the parameter comes off the URL. */
  onPage: (page: number) => void;
}) {
  if (last <= 1) return null;

  const tokens: Array<number | "gap"> = [];
  if (last <= 7) {
    for (let i = 1; i <= last; i += 1) tokens.push(i);
  } else {
    tokens.push(1);
    const from = Math.max(2, page - 1);
    const to = Math.min(last - 1, page + 1);
    if (from > 2) tokens.push("gap");
    for (let i = from; i <= to; i += 1) tokens.push(i);
    if (to < last - 1) tokens.push("gap");
    tokens.push(last);
  }

  const arrow =
    "grid size-8 cursor-pointer place-items-center rounded-sm border border-line-strong bg-surface disabled:cursor-default disabled:opacity-40";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={t("pages.previous")}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={arrow}
      >
        <ChevronLeft className="size-4" />
      </button>

      {tokens.map((token, i) =>
        token === "gap" ? (
          <span key={`gap${i}`} className="min-w-7 text-center text-fg-subtle">
            &hellip;
          </span>
        ) : (
          <button
            key={token}
            type="button"
            aria-current={token === page ? "page" : undefined}
            onClick={() => onPage(token)}
            className={cn(
              "h-8 min-w-8 cursor-pointer rounded-sm border px-2 text-[13px]",
              token === page
                ? "border-fg font-semibold text-fg"
                : "border-transparent font-medium text-fg-muted hover:bg-sunken",
            )}
          >
            {token}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label={t("pages.next")}
        disabled={page >= last}
        onClick={() => onPage(page + 1)}
        className={arrow}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
