"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { brandRamp, hexToOklch, oklchToHex, isHex } from "../lib/brand-colour";

/**
 * R1.1, R24.4. Picking a colour, without the operating system drawing it.
 *
 * `<input type="color">` opens the platform's own colour panel, in its own
 * words, over the product, which is the one thing this design system refuses
 * outright. So the wheel is ours: a hue rail, a strength rail, the hex the
 * church already knows, and the eight the product ships, which is what most
 * churches will press.
 *
 * What comes back is always a `#rrggbb`. Whoever reads it decides what to do
 * with it, and in this product that is `brandRamp`, which keeps the hue and
 * rebuilds the lightness so a brand can never cost a church its contrast.
 */

/** The eight the product ships, as the colours they are. */
const READY = [
  { name: "rose", hex: "#d4374f" },
  { name: "amber", hex: "#c87a0a" },
  { name: "citron", hex: "#8a8f12" },
  { name: "fern", hex: "#1e8a4c" },
  { name: "teal", hex: "#0d8694" },
  { name: "sky", hex: "#1877c4" },
  { name: "indigo", hex: "#4f46e5" },
  { name: "violet", hex: "#8339d9" },
] as const;

/** Where a rail's thumb sits, and what a press anywhere on it means. */
function useRail(onPick: (fraction: number) => void) {
  const rail = React.useRef<HTMLDivElement>(null);

  const readAt = (clientX: number) => {
    const box = rail.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    onPick(Math.min(1, Math.max(0, (clientX - box.left) / box.width)));
  };

  return {
    rail,
    handlers: {
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        readAt(event.clientX);
      },
      onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        readAt(event.clientX);
      },
      onPointerUp: (event: React.PointerEvent<HTMLDivElement>) =>
        event.currentTarget.releasePointerCapture(event.pointerId),
    },
  };
}

export function ColourPicker({
  value,
  onChange,
  disabled,
  labels,
  className,
}: {
  /** A `#rrggbb`. Anything else is read as the first of the eight. */
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  /** Every word on this control, so the catalogue owns them. */
  labels: {
    hue: string;
    strength: string;
    hex: string;
    invalid: string;
  };
  className?: string;
}) {
  const held = isHex(value) ? value : READY[6]!.hex;
  const colour = hexToOklch(held)!;

  /*
   * The box is typed in freely and only reaches the caller when it reads as a
   * colour. Somebody halfway through typing "#1a2" has not chosen grey.
   */
  const [typed, setTyped] = React.useState(held);
  React.useEffect(() => setTyped(held), [held]);
  const typedBad = typed.trim() !== "" && !isHex(typed);

  const move = (next: { h?: number; c?: number }) =>
    onChange(
      oklchToHex({
        l: colour.l,
        c: next.c ?? colour.c,
        h: next.h ?? colour.h,
      }),
    );

  /** 0.37 is about as much chroma as sRGB holds anywhere. */
  const MOST = 0.37;

  const hueRail = useRail((at) => move({ h: at * 360 }));
  const chromaRail = useRail((at) => move({ c: at * MOST }));

  const ramp = brandRamp(held);

  const railClass = cn(
    "relative h-7 w-full rounded-full border border-line",
    disabled ? "cursor-default" : "cursor-pointer touch-none",
  );

  const thumb = (at: number) => (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-surface)] shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
      style={{ left: `${at * 100}%`, background: held }}
    />
  );

  return (
    <div className={cn("flex max-w-[420px] flex-col gap-3", className)}>
      {/* The eight the product ships, first, because most churches are near
          one of them and pressing one is the whole job. */}
      <div className="flex flex-wrap gap-1.5">
        {READY.map((one) => (
          <button
            key={one.name}
            type="button"
            aria-label={one.name}
            aria-pressed={held.toLowerCase() === one.hex}
            disabled={disabled}
            onClick={() => onChange(one.hex)}
            className={cn(
              "rounded-full p-1 ring-2",
              held.toLowerCase() === one.hex ? "ring-primary" : "ring-transparent",
              disabled ? "cursor-default" : "cursor-pointer hover:ring-line-strong",
            )}
          >
            <span
              className="block size-5 rounded-full border border-line"
              style={{ background: one.hex }}
            />
          </button>
        ))}
      </div>

      {/* The rails carry their names for a screen reader and nothing on
          screen: two words over two coloured bars said what the bars were
          already saying. */}
      <div
        {...(disabled ? {} : hueRail.handlers)}
        ref={hueRail.rail}
        role="slider"
        aria-label={labels.hue}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(colour.h)}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 15 : 3;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move({ h: (colour.h - step + 360) % 360 });
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move({ h: (colour.h + step) % 360 });
          }
        }}
        className={railClass}
        style={{
          background:
            "linear-gradient(to right,"
            + [0, 60, 120, 180, 240, 300, 360]
              .map((h) => `oklch(0.645 0.148 ${h})`)
              .join(",")
            + ")",
        }}
      >
        {thumb(colour.h / 360)}
      </div>

      <div
        {...(disabled ? {} : chromaRail.handlers)}
        ref={chromaRail.rail}
        role="slider"
        aria-label={labels.strength}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((colour.c / MOST) * 100)}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.04 : 0.01;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move({ c: Math.max(0, colour.c - step) });
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move({ c: Math.min(MOST, colour.c + step) });
          }
        }}
        className={railClass}
        style={{
          background: `linear-gradient(to right, oklch(${colour.l.toFixed(3)} 0 ${colour.h.toFixed(0)}), oklch(${colour.l.toFixed(3)} ${MOST} ${colour.h.toFixed(0)}))`,
        }}
      >
        {thumb(Math.min(1, colour.c / MOST))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {/* R24.4. The colour as the product will actually draw it, which is
              the hue they picked at the lightness everything else is at. */}
          <span
            aria-hidden
            className="size-[var(--d-control-h)] shrink-0 rounded-[var(--d-radius-control)] border border-line"
            style={{ background: ramp["500"] }}
          />
          <input
            type="text"
            inputMode="text"
            spellCheck={false}
            autoComplete="off"
            aria-label={labels.hex}
            value={typed}
            disabled={disabled}
            onChange={(event) => {
              setTyped(event.target.value);
              const clean = event.target.value.trim();
              if (isHex(clean)) onChange(oklchToHex(hexToOklch(clean)!));
            }}
            onBlur={() => setTyped(held)}
            aria-invalid={typedBad || undefined}
            className={cn(
              "h-[var(--d-control-h)] w-[140px] rounded-[var(--d-radius-control)] border bg-surface px-3",
              "font-mono text-[length:var(--d-text-body)] text-fg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              typedBad ? "border-danger-border" : "border-line-strong",
            )}
          />
        </div>
        {typedBad ? (
          <span className="text-caption text-danger-text">{labels.invalid}</span>
        ) : null}
      </div>
    </div>
  );
}
