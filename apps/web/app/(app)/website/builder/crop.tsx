"use client";

/**
 * HRT-380, R22.2. Cropping a picture by dragging it.
 *
 * A church positions a photograph by moving it under a frame, the way every
 * photo cropper works. The two numbers underneath, `focus` and `zoom`, are
 * what `Pic` already reads, so the frame here draws the picture with the same
 * styles the published section draws it with: the same `objectFit`, the same
 * `objectPosition` off the focus, and the same `scale(zoom)` about that focus.
 * What somebody sees while dragging is what the page renders.
 *
 * Every change goes out through the caller's `onSet` with one merge key, so a
 * whole drag collapses into a single undo step and the canvas behind the box
 * redraws as it happens.
 */

import * as React from "react";
import { Crop } from "lucide-react";
import { t } from "@connectapp/i18n";
import type { SiteImage } from "@connectapp/db/rules";
import {
  Button, Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger, Field,
} from "@connectapp/ui";
import { mediaUrl } from "@/components/church-site/kit";

/**
 * The shape of the frame somebody crops in.
 *
 * A picture field does not know the aspect ratio the section will draw it at,
 * so this is an approximation: a landscape frame close to what most of the
 * bands use. The crop itself holds whatever shape the design asks for, because
 * `focus` and `zoom` are proportions rather than pixels.
 */
const SHAPE = 16 / 10;

/** How far one arrow press moves the focus, and how far one with Shift held. */
const STEP = 0.02;
const BIG_STEP = 0.1;

const RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
  + " focus-visible:outline-primary";

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const percent = (focus: { x: number; y: number }): string =>
  `${Math.round(focus.x * 100)}% ${Math.round(focus.y * 100)}%`;

/**
 * How many pixels of the picture are hidden on each axis, at this zoom.
 *
 * `Pic` lays the picture out as a box the size of the frame, fits the content
 * inside it, then scales the box about the focus. Working that through, the
 * content's left edge lands at `focus.x * (frameWidth - zoom * contentWidth)`,
 * whichever fit is in use. So the whole range of a focus from 0 to 1 moves the
 * picture by `zoom * contentWidth - frameWidth`, and dragging by `dx` pixels is
 * a focus change of `-dx` over that travel. Because the travel is exactly the
 * hidden part, a focus inside 0 to 1 can never pull empty space into the
 * frame: clamping the focus is the whole of the clamping.
 *
 * A travel of zero is a picture with nothing hidden on that axis, where the
 * focus has no work to do, so that axis does not move.
 */
function travelOf(
  frame: { w: number; h: number },
  natural: { w: number; h: number },
  fit: "cover" | "contain",
  zoom: number,
): { x: number; y: number } {
  if (!frame.w || !frame.h || !natural.w || !natural.h) return { x: 0, y: 0 };
  const ratio = natural.w / natural.h;
  const pick = fit === "contain" ? Math.min : Math.max;
  const contentW = pick(frame.w, frame.h * ratio);
  const contentH = pick(frame.h, frame.w / ratio);
  return {
    x: Math.max(0, zoom * contentW - frame.w),
    y: Math.max(0, zoom * contentH - frame.h),
  };
}

/* ------------------------------------------------------------- the frame --- */

function Frame({
  image, onMove,
}: {
  image: SiteImage;
  onMove: (focus: { x: number; y: number }) => void;
}) {
  const src = mediaUrl(image);
  const focus = image.focus ?? { x: 0.5, y: 0.5 };
  const zoom = image.zoom ?? 1;
  const fit = image.fit === "contain" ? "contain" : "cover";
  const said = React.useId();

  const box = React.useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = React.useState({ w: 0, h: 0 });
  /** What the drag started from, so every move is measured from one place. */
  const from = React.useRef<
    { id: number; x: number; y: number; focus: { x: number; y: number }; travel: { x: number; y: number } } | null
  >(null);
  const [dragging, setDragging] = React.useState(false);

  const position = percent(focus);

  const start = (event: React.PointerEvent<HTMLDivElement>) => {
    const frame = box.current?.getBoundingClientRect();
    if (!frame) return;
    const travel = travelOf(
      { w: frame.width, h: frame.height }, natural, fit, zoom,
    );
    if (!travel.x && !travel.y) return;
    from.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      focus,
      travel,
    };
    /* So a drag that runs off the frame, or off the box, keeps working. */
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const held = from.current;
    if (!held || held.id !== event.pointerId) return;
    const next = {
      x: held.travel.x ? clamp(held.focus.x - (event.clientX - held.x) / held.travel.x) : held.focus.x,
      y: held.travel.y ? clamp(held.focus.y - (event.clientY - held.y) / held.travel.y) : held.focus.y,
    };
    if (next.x !== focus.x || next.y !== focus.y) onMove(next);
  };

  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    if (from.current?.id !== event.pointerId) return;
    from.current = null;
    setDragging(false);
  };

  const key = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? BIG_STEP : STEP;
    const by: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const way = by[event.key];
    if (!way) return;
    const frame = box.current?.getBoundingClientRect();
    const travel = frame
      ? travelOf({ w: frame.width, h: frame.height }, natural, fit, zoom)
      : { x: 0, y: 0 };
    if (!travel.x && !travel.y) return;
    event.preventDefault();
    onMove({
      x: travel.x ? clamp(focus.x + way.x * step) : focus.x,
      y: travel.y ? clamp(focus.y + way.y * step) : focus.y,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={box}
        tabIndex={0}
        role="group"
        aria-labelledby={said}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={() => { from.current = null; setDragging(false); }}
        onKeyDown={key}
        style={{ aspectRatio: String(SHAPE) }}
        className={`w-full touch-none select-none overflow-hidden rounded-[var(--d-radius-control)] border border-line bg-sunken ${dragging ? "cursor-grabbing" : "cursor-grab"} ${RING}`}
      >
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element -- the church's
             own storage, served through /site-media, as `Pic` serves it. */
          <img
            src={src}
            alt={image.alt}
            draggable={false}
            decoding="async"
            onLoad={(event) => setNatural({
              w: event.currentTarget.naturalWidth,
              h: event.currentTarget.naturalHeight,
            })}
            className="size-full"
            style={{
              objectFit: fit,
              objectPosition: position,
              ...(zoom > 1
                ? { transform: `scale(${zoom})`, transformOrigin: position }
                : {}),
            }}
          />
        ) : null}
      </div>
      <p id={said} className="text-[length:var(--d-text-label)] text-fg-muted">
        {t("website.crop.drag")}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- the whole --- */

export function CropControl({
  image, onSet, merge,
}: {
  image: SiteImage;
  /** Writes the picture back, with the merge key that holds the undo step. */
  onSet: (image: SiteImage, merge?: string) => void;
  /** The stem of the merge key: a drag is one step, the zoom slider another. */
  merge: string;
}) {
  const zoom = image.zoom ?? 1;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" full>
          <Crop aria-hidden />
          {t("website.crop.open")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("website.crop.title")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <Frame
            image={image}
            onMove={(focus) => onSet({ ...image, focus }, `${merge}:focus`)}
          />

          <Field
            label={t("website.crop.zoom")}
            action={<span className="text-fg-muted tabular-nums">{zoom.toFixed(2)}</span>}
          >
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(event) => onSet(
                { ...image, zoom: Number(event.target.value) }, `${merge}:zoom`,
              )}
              className={`h-[var(--d-tap)] w-full cursor-pointer accent-primary ${RING}`}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onSet({ ...image, focus: { x: 0.5, y: 0.5 }, zoom: 1 })}
          >
            {t("website.crop.reset")}
          </Button>
          <DialogClose asChild>
            <Button>{t("website.crop.apply")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
