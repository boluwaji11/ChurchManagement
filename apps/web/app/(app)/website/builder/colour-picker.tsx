"use client";

/**
 * HRT-380, R24.6. Choosing a colour by looking at it.
 *
 * A hex field is exact and nobody arrives knowing the hex of the green they
 * want. So this is the usual two controls: a square where the across is how
 * much colour and the down is how dark, and a bar of hues under it. The hex
 * field stays beside them, because a church handed a brand colour on a sheet
 * of paper wants to type it.
 *
 * Drawn rather than `<input type="color">`, which opens the colour picker the
 * operating system draws, in its own words and its own grey. The rule is in
 * CLAUDE.md and it is the same rule as the one about bare selects.
 */

import * as React from "react";
import { t } from "@connectapp/i18n";

/** A colour as the picker holds it: hue 0 to 360, the other two 0 to 1. */
interface Hsv {
  h: number;
  s: number;
  v: number;
}

const clamp = (value: number, low = 0, high = 1) =>
  Math.min(high, Math.max(low, value));

export function hexToHsv(hex: string): Hsv {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const span = high - low;
  let h = 0;
  if (span !== 0) {
    if (high === r) h = ((g - b) / span) % 6;
    else if (high === g) h = (b - r) / span + 2;
    else h = (r - g) / span + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s: high === 0 ? 0 : span / high, v: high };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  const byte = (one: number) =>
    Math.round((one + m) * 255).toString(16).padStart(2, "0");
  return `#${byte(r!)}${byte(g!)}${byte(b!)}`;
}

/** A square or a bar that answers a drag anywhere inside it. */
function useDrag(onMove: (x: number, y: number) => void) {
  const held = React.useRef<HTMLDivElement | null>(null);
  const read = (event: React.PointerEvent) => {
    const box = held.current?.getBoundingClientRect();
    if (!box) return;
    onMove(
      clamp((event.clientX - box.left) / box.width),
      clamp((event.clientY - box.top) / box.height),
    );
  };
  return {
    ref: held,
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      read(event);
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      read(event);
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
  };
}

const KNOB =
  "pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
  + " border-2 border-white shadow-[0_0_0_1px_oklch(0_0_0/0.35)]";

export function ColourPicker({
  value,
  onChange,
  label,
}: {
  /** A six-digit hex value. */
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  const hsv = React.useMemo(() => hexToHsv(value), [value]);
  /* The hue is kept here as well: a colour with no saturation has no hue of
     its own, and reading it back would snap the bar to red every time
     somebody dragged into the white corner. */
  const [hue, setHue] = React.useState(hsv.h);
  React.useEffect(() => {
    if (hsv.s > 0.02 && hsv.v > 0.02) setHue(hsv.h);
  }, [hsv.h, hsv.s, hsv.v]);

  const field = useDrag((x, y) => onChange(hsv2(hue, x, 1 - y)));
  const bar = useDrag((x) => onChange(hsv2(x * 360, hsv.s || 1, hsv.v || 1)));

  const step = (by: { h?: number; s?: number; v?: number }) =>
    onChange(hsvToHex({
      h: (hue + (by.h ?? 0) + 360) % 360,
      s: clamp(hsv.s + (by.s ?? 0)),
      v: clamp(hsv.v + (by.v ?? 0)),
    }));

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={field.ref}
        role="application"
        aria-label={label}
        tabIndex={0}
        onPointerDown={field.onPointerDown}
        onPointerMove={field.onPointerMove}
        onPointerUp={field.onPointerUp}
        onKeyDown={(event) => {
          const by = 0.04;
          if (event.key === "ArrowLeft") step({ s: -by });
          else if (event.key === "ArrowRight") step({ s: by });
          else if (event.key === "ArrowUp") step({ v: by });
          else if (event.key === "ArrowDown") step({ v: -by });
          else return;
          event.preventDefault();
        }}
        className={
          "relative h-32 w-full cursor-crosshair touch-none rounded-[10px]"
          + " border border-line focus-visible:outline focus-visible:outline-2"
          + " focus-visible:outline-offset-2 focus-visible:outline-primary"
        }
        style={{
          background:
            `linear-gradient(to top, #000, transparent),`
            + `linear-gradient(to right, #fff, hsl(${hue} 100% 50%))`,
        }}
      >
        <span
          className={KNOB}
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: value,
          }}
        />
      </div>

      <div
        ref={bar.ref}
        role="application"
        aria-label={t("website.colour.hue")}
        tabIndex={0}
        onPointerDown={bar.onPointerDown}
        onPointerMove={bar.onPointerMove}
        onPointerUp={bar.onPointerUp}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step({ h: -4 });
          else if (event.key === "ArrowRight") step({ h: 4 });
          else return;
          event.preventDefault();
        }}
        className={
          "relative h-4 w-full cursor-pointer touch-none rounded-full border border-line"
          + " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          + " focus-visible:outline-primary"
        }
        style={{
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <span
          className={`${KNOB} top-1/2`}
          style={{ left: `${(hue / 360) * 100}%`, background: `hsl(${hue} 100% 50%)` }}
        />
      </div>
    </div>
  );
}

/** Builds a hex from a hue and the two the square carries. */
function hsv2(h: number, s: number, v: number): string {
  return hsvToHex({ h, s, v });
}
