import * as React from "react";
import { cn } from "@connectapp/ui";

/**
 * The marks behind the website: a dove, wheat, a cup, bread, an open book, a
 * candle, an olive branch, a fish, water and a cross.
 *
 * Drawn here rather than taken from an illustration library. Every set we
 * looked at is a set of people in flat colour with a licence written as the
 * word "free", and a product whose argument is that a church can trust it does
 * not want an unread licence on its first screen. Drawn, they inherit the
 * token, redraw at any size, cost no request, and are ours.
 *
 * One continuous line each, round caps, a little off true, so the page reads as
 * drawn by a hand rather than set by a machine. They sit behind the words at
 * low opacity and are hidden from a screen reader: they carry no meaning a
 * reader would miss.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden {...STROKE}>
      {children}
    </svg>
  );
}

export const Dove = () => (
  <Glyph>
    <circle cx="44" cy="22" r="4" />
    <path d="M48 23l6 2-6 2.5" />
    <path d="M41 25c-9 0-19 6-25 18 8 2 18 0 24-6 4-4 4-9 1-12Z" />
    <path d="M30 33c-2-8 2-16 10-19 0 7-3 14-9 19" />
    <path d="M17 42L7 47M19 44L10 51" />
  </Glyph>
);

export const Wheat = () => (
  <Glyph>
    <path d="M32 58V20" />
    <path d="M32 20c-4-3-6-7-5-12 5 1 8 5 9 10M32 20c4-3 6-7 5-12-5 1-8 5-9 10" />
    <path d="M32 32c-5-2-8-6-8-11 5 0 9 3 11 8M32 32c5-2 8-6 8-11-5 0-9 3-11 8" />
    <path d="M32 44c-5-2-8-6-8-11 5 0 9 3 11 8M32 44c5-2 8-6 8-11-5 0-9 3-11 8" />
  </Glyph>
);

export const Cup = () => (
  <Glyph>
    <path d="M18 14h28c0 12-4 20-14 22-10-2-14-10-14-22Z" />
    <path d="M32 36v14" />
    <path d="M20 52h24" />
    <path d="M46 18c5 0 7 3 6 7-1 3-4 5-8 5" />
  </Glyph>
);

export const Bread = () => (
  <Glyph>
    <path d="M10 38c0-10 9-16 22-16s22 6 22 16c0 4-3 6-7 6H17c-4 0-7-2-7-6Z" />
    <path d="M22 30c2-3 5-5 8-5M32 28c2-3 5-4 8-4" />
  </Glyph>
);

export const Book = () => (
  <Glyph>
    <path d="M32 20c-5-4-12-6-20-5v30c8-1 15 1 20 5 5-4 12-6 20-5V15c-8-1-15 1-20 5Z" />
    <path d="M32 20v30" />
  </Glyph>
);

export const Candle = () => (
  <Glyph>
    <path d="M25 50V28h14v22" />
    <path d="M20 50h24" />
    <path d="M32 28c-3-4-2-8 0-12 2 4 3 8 0 12Z" />
  </Glyph>
);

export const Olive = () => (
  <Glyph>
    <path d="M10 54C22 46 34 33 46 14" />
    <path d="M22 42c-5-1-8-4-8-9 5 0 9 3 10 8M26 36c5-3 9-2 12 2-5 2-10 1-12-2" />
    <path d="M31 28c-5-1-8-4-8-9 5 0 9 3 10 8M35 22c5-3 9-2 12 2-5 2-10 1-12-2" />
  </Glyph>
);

export const Fish = () => (
  <Glyph>
    <path d="M12 32c8-12 24-16 36-8-4 10-16 18-28 16" />
    <path d="M12 32c6 10 20 14 32 8" />
    <path d="M48 24c3-3 6-4 8-3-1 7-1 13 0 19-3 1-6-1-9-4" />
  </Glyph>
);

export const Water = () => (
  <Glyph>
    <path d="M8 26c6-5 12-5 18 0s12 5 18 0 10-4 12-1" />
    <path d="M8 36c6-5 12-5 18 0s12 5 18 0 10-4 12-1" />
    <path d="M8 46c6-5 12-5 18 0s12 5 18 0 10-4 12-1" />
  </Glyph>
);

export const Cross = () => (
  <Glyph>
    <path d="M32 9v46" />
    <path d="M17 24h30" />
  </Glyph>
);

type Mark = () => React.JSX.Element;

/** Where one mark sits, how big, and how far it turns. */
interface Spot {
  mark: Mark;
  /** Per cent across and down the section. */
  x: number;
  y: number;
  size: number;
  turn: number;
}

/**
 * The marks behind a section.
 *
 * Positioned in per cent so they hold their place as the section grows, and
 * clipped to it so nothing leaks onto the band above or below. Below 768px they
 * come off: a phone has no margin to put them in, and a mark under a paragraph
 * is noise rather than warmth.
 */
export function Doodles({ spots, className }: { spots: Spot[]; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 hidden overflow-hidden text-primary md:block",
        className,
      )}
    >
      {spots.map((spot, i) => (
        <span
          key={i}
          className="absolute block opacity-[0.09]"
          style={{
            left: `${spot.x}%`,
            top: `${spot.y}%`,
            width: spot.size,
            height: spot.size,
            transform: `translate(-50%, -50%) rotate(${spot.turn}deg)`,
          }}
        >
          {spot.mark()}
        </span>
      ))}
    </div>
  );
}

export type { Spot };
