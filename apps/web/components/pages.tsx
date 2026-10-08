"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, Spinner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R2.14, R24.6. Numbered pages, as the design has them.
 *
 * Arrows either side, the first and last page always reachable, an ellipsis
 * where the run is broken. Written once because a church counting members and a
 * church reading form responses are doing the same thing with the same control.
 */
export function Pages({
  page,
  last,
  onPage,
  anchor,
}: {
  page: number;
  last: number;
  /** Given the page wanted, 1 meaning the parameter comes off the URL. */
  onPage: (page: number) => void;
  /**
   * R24.6. The id of the block this belongs to.
   *
   * Turning a page is a navigation, and a navigation lands at the top of
   * the screen. Somebody reading the third table down then has to scroll
   * back to it after every press. Naming the block brings them to its head
   * instead, which is where the new rows are.
   */
  anchor?: string;
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

  /*
   * R24.6. Every caller of this navigates, and a server-rendered page can
   * take a moment, so the pager holds the press: the page being opened is
   * marked and the whole row stops taking presses until it lands.
   */
  const [going, setGoing] = React.useState<number>();
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    if (pending) return;
    setGoing(undefined);
  }, [pending]);

  const go = (to: number) => {
    setGoing(to);
    start(() => {
      onPage(to);
      /*
       * After the rows, not before: scrolling first and navigating second
       * puts the reader at the head of the old page and then the router
       * takes them back to the top anyway.
       */
      if (anchor) {
        requestAnimationFrame(() => {
          document.getElementById(anchor)?.scrollIntoView({ block: "start" });
        });
      }
    });
  };

  const arrow =
    "grid size-8 cursor-pointer place-items-center rounded-sm border border-line-strong bg-surface disabled:cursor-default disabled:opacity-40";

  return (
    /* Seven numbers and two arrows are wider than a phone, so the row wraps
       rather than taking the page off the side. */
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        aria-label={t("pages.previous")}
        disabled={page <= 1 || pending}
        onClick={() => go(page - 1)}
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
            disabled={pending}
            onClick={() => go(token)}
            className={cn(
              "h-8 min-w-8 cursor-pointer rounded-sm border px-2 text-[13px]",
              token === page
                ? "border-fg font-semibold text-fg"
                : "border-transparent font-medium text-fg-muted hover:bg-sunken",
            )}
          >
            {going === token ? <Spinner className="align-middle" /> : token}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label={t("pages.next")}
        disabled={page >= last || pending}
        onClick={() => go(page + 1)}
        className={arrow}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
