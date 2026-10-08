"use client";

import * as React from "react";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { IconButton, Spinner } from "@connectapp/ui";
import { GRID_COLUMNS, type ReportTile } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import { Answer } from "../answer";
import type { Part } from "../plot";
import type { ReportResultish } from "./actions";

/** How tall one row of the grid is, before the gap. */
const ROW = 72;

type Grab =
  | { kind: "move"; id: string; fromX: number; fromY: number; atX: number; atY: number }
  | { kind: "size"; id: string; fromW: number; fromH: number; atX: number; atY: number };

/**
 * R18.12. The page of visuals, and the dragging that arranges it.
 *
 * A twelve-column grid rather than free placement. Free placement looks
 * powerful in a demo and produces a page of tiles that do not line up, and a
 * church is not going to nudge pixels. Snapping means anything dropped roughly
 * in place lands exactly in place.
 */
export function Canvas({
  tiles,
  results,
  running,
  selected,
  onSelect,
  onMove,
  onRemove,
  onDuplicate,
  onRename,
  onPart,
}: {
  tiles: ReportTile[];
  results: Record<string, ReportResultish | undefined>;
  running: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, place: ReportTile["place"]) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, title: string) => void;
  /** A piece of a visual was pressed, so the Format pane can open on it. */
  onPart: (id: string, part: Part) => void;
}) {
  const board = React.useRef<HTMLDivElement>(null);
  const [grab, setGrab] = React.useState<Grab | null>(null);

  /** How wide one column is right now, so a drag can be read in cells. */
  const cell = () => {
    const width = board.current?.clientWidth ?? 1;
    return (width - 12 * (GRID_COLUMNS - 1)) / GRID_COLUMNS + 12;
  };

  React.useEffect(() => {
    if (!grab) return;

    const move = (e: PointerEvent) => {
      const dx = Math.round((e.clientX - grab.atX) / cell());
      const dy = Math.round((e.clientY - grab.atY) / (ROW + 12));
      const tile = tiles.find((one) => one.id === grab.id);
      if (!tile) return;

      if (grab.kind === "move") {
        onMove(grab.id, {
          ...tile.place,
          x: Math.min(GRID_COLUMNS - tile.place.w, Math.max(0, grab.fromX + dx)),
          y: Math.max(0, grab.fromY + dy),
        });
      } else {
        const w = Math.min(GRID_COLUMNS - tile.place.x, Math.max(2, grab.fromW + dx));
        onMove(grab.id, { ...tile.place, w, h: Math.min(12, Math.max(2, grab.fromH + dy)) });
      }
    };

    const done = () => setGrab(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", done);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", done);
    };
  }, [grab, tiles, onMove]);

  return (
    <div
      ref={board}
      /* R24.6. One visual to a row on a phone. A twelve-column page at 390px
         puts a chart in 150 points of width, which is a picture of a chart
         rather than a chart. The arrangement is kept and read back at the
         width it was made for. */
      className="grid min-h-[420px] grid-cols-1 gap-3 sm:[grid-auto-rows:var(--report-row)] sm:[grid-template-columns:repeat(var(--report-cols),minmax(0,1fr))]"
      style={
        {
          "--report-cols": GRID_COLUMNS,
          "--report-row": `${ROW}px`,
        } as React.CSSProperties
      }
    >
      {tiles.map((tile) => {
        const result = results[tile.id];
        const on = selected === tile.id;
        return (
          <section
            key={tile.id}
            onPointerDown={() => onSelect(tile.id)}
            style={
              {
                "--tile-x": tile.place.x + 1,
                "--tile-w": tile.place.w,
                "--tile-y": tile.place.y + 1,
                "--tile-h": tile.place.h,
              } as React.CSSProperties
            }
            className={
              "relative flex min-h-[280px] min-w-0 flex-col overflow-hidden rounded-[14px] bg-surface p-3 sm:min-h-0 sm:p-4"
              + " sm:[grid-column:var(--tile-x)/span_var(--tile-w)]"
              + " sm:[grid-row:var(--tile-y)/span_var(--tile-h)]"
              + (on
                ? " border-2 border-primary"
                : " border border-line hover:border-line-strong")
            }
          >
            <div className="mb-2 flex items-center gap-1.5">
              {/* The handle. Dragging the body would fight with reading it,
                  and dragging the title would fight with renaming it. */}
              <button
                type="button"
                aria-label={t("report.moveTile")}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSelect(tile.id);
                  setGrab({
                    kind: "move",
                    id: tile.id,
                    fromX: tile.place.x,
                    fromY: tile.place.y,
                    atX: e.clientX,
                    atY: e.clientY,
                  });
                }}
                className="hidden shrink-0 cursor-grab rounded-sm p-0.5 text-fg-subtle hover:text-fg-muted active:cursor-grabbing sm:block"
              >
                <GripVertical className="size-4" aria-hidden />
              </button>

              <input
                value={tile.title}
                onChange={(e) => onRename(tile.id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder={nameOf(tile)}
                aria-label={t("report.tileTitle")}
                className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1 py-0.5 font-display text-[17px] leading-6 text-fg outline-none placeholder:text-fg hover:border-line focus:border-primary"
              />

              {running ? <Spinner className="size-3.5 shrink-0" /> : null}

              {on ? (
                <span className="flex shrink-0 items-center">
                  <IconButton
                    label={t("report.duplicateTile")}
                    variant="ghost"
                    className="size-9 min-h-0 sm:size-7 [&_svg]:size-3.5"
                    onClick={() => onDuplicate(tile.id)}
                  >
                    <Copy />
                  </IconButton>
                  <IconButton
                    label={t("report.removeTile")}
                    variant="ghost"
                    className="size-9 min-h-0 sm:size-7 [&_svg]:size-3.5"
                    onClick={() => onRemove(tile.id)}
                  >
                    <Trash2 />
                  </IconButton>
                </span>
              ) : null}
            </div>

            {/* The visual takes the box, so what was sized is what is drawn. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {result?.error ? (
                <p className="text-[13px] text-danger-text">{result.error}</p>
              ) : result && result.rows.length === 0 ? (
                <p className="text-[13px] text-fg-muted">{t("report.nothingMatches")}</p>
              ) : result ? (
                <Answer
                  spec={tile}
                  result={result}
                  fill
                  onPart={(part) => { onSelect(tile.id); onPart(tile.id, part); }}
                />
              ) : (
                <p className="text-[13px] text-fg-subtle">{t("report.running")}</p>
              )}
            </div>

            {/* The corner, for the size. */}
            <span
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(tile.id);
                setGrab({
                  kind: "size",
                  id: tile.id,
                  fromW: tile.place.w,
                  fromH: tile.place.h,
                  atX: e.clientX,
                  atY: e.clientY,
                });
              }}
              role="separator"
              aria-label={t("report.resizeTile")}
              className="absolute bottom-0 right-0 hidden size-4 cursor-nwse-resize sm:block"
              style={{
                background:
                  "linear-gradient(135deg, transparent 50%, var(--line-strong) 50%, var(--line-strong) 62%, transparent 62%)",
              }}
            />
          </section>
        );
      })}
    </div>
  );
}

/** What a visual is called when nobody has named it. */
function nameOf(tile: ReportTile): string {
  if (!tile.groupBy) return t(`report.subject.${tile.subject}` as never);
  return t("report.by", { field: t(`report.field.${tile.groupBy}` as never) });
}
