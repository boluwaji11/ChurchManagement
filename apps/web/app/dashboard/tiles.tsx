"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import { t } from "@connectapp/i18n";
import { Tooltip } from "@connectapp/ui";

export interface Tile {
  id: string;
  label: string;
  value: string;
  sub: string;
  hue: string;
}

/** Where this browser last left the tiles. One church's order is not another's. */
const keyFor = (church: string) => `connectapp.dashboard.tiles.${church}`;

/**
 * R18.1. The four numbers, in the order this reader wants them.
 *
 * Which number matters most is a question about the church rather than about
 * the product: a children's ministry lead opens this for the visitors, a pastor
 * for the follow-ups. So the order is theirs to set, by dragging or by the
 * arrow keys on the handle, and it is remembered in this browser.
 */
export function Tiles({ church, tiles }: { church: string; tiles: Tile[] }) {
  const [order, setOrder] = React.useState<string[]>(() => tiles.map((one) => one.id));
  const held = React.useRef<string | null>(null);

  // Read after mounting rather than during the first render, so the server's
  // markup and the browser's first pass are the same.
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(keyFor(church));
      if (!saved) return;
      const want: string[] = JSON.parse(saved);
      setOrder(tiles.map((one) => one.id).sort((a, b) => {
        const ai = want.indexOf(a);
        const bi = want.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }));
    } catch {
      // A browser with storage turned off reads the order it was given.
    }
  }, [church, tiles]);

  const settle = React.useCallback(
    (next: string[]) => {
      setOrder(next);
      try {
        window.localStorage.setItem(keyFor(church), JSON.stringify(next));
      } catch {
        // Nothing to do. The order holds for this visit.
      }
    },
    [church],
  );

  const moveTo = (id: string, to: number) => {
    const from = order.indexOf(id);
    if (from === -1 || to < 0 || to >= order.length || to === from) return;
    const next = order.filter((one) => one !== id);
    next.splice(to, 0, id);
    settle(next);
  };

  const shown = order
    .map((id) => tiles.find((one) => one.id === id))
    .filter((one): one is Tile => Boolean(one));

  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
      {shown.map((tile, i) => (
        <div
          key={tile.id}
          draggable
          onDragStart={() => { held.current = tile.id; }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (held.current) moveTo(held.current, i);
            held.current = null;
          }}
          className="flex flex-col rounded-[14px] border border-line bg-surface p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-fg-muted">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: `var(--hue-${tile.hue}-500)` }}
              />
              <span className="truncate">{tile.label}</span>
            </span>
            <Tooltip content={t("dashboard.reorder")}>
            <button
              type="button"
              aria-label={t("dashboard.moveTile", { label: tile.label })}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") { e.preventDefault(); moveTo(tile.id, i - 1); }
                if (e.key === "ArrowRight") { e.preventDefault(); moveTo(tile.id, i + 1); }
              }}
              className="-mr-1.5 grid size-8 shrink-0 cursor-grab place-items-center rounded-sm text-fg-subtle hover:text-fg-muted"
            >
              <GripVertical className="size-3.5" aria-hidden />
            </button>
            </Tooltip>
          </div>

          <p data-numeric className="mt-3 font-display text-[40px] leading-[44px] text-fg">
            {tile.value}
          </p>
          <p className="mt-1 text-[13px] text-fg-muted">{tile.sub}</p>
        </div>
      ))}
    </div>
  );
}
