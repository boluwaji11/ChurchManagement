import * as React from "react";
import { cn } from "../lib/cn";

/**
 * The spectrum. Eight hues at matched lightness and chroma, evenly spread around
 * the wheel, assigned to things rather than sprinkled on them: rooms, teams,
 * group types, funds, ministries, pipeline stages. Colour as data. (R24.4)
 *
 * Eight, not twelve. Eight is what a church actually needs, and the four we cut
 * sat close enough to their neighbours that nobody could tell them apart at a
 * glance, which is the only thing a hue is for here.
 */
export const HUES = ["rose", "amber", "citron", "fern", "teal", "sky", "indigo", "violet"] as const;

/**
 * Every hue with CSS defined, which is a superset of the palette. Storage keeps
 * all twelve permitted, so a value set before the palette was trimmed still
 * renders correctly rather than resolving to an undefined custom property.
 * Nothing assigns from this list.
 */
export const ALL_HUES = [
  "rose", "coral", "amber", "citron", "fern", "jade",
  "teal", "sky", "indigo", "violet", "orchid", "clay",
] as const;

export type Hue = (typeof ALL_HUES)[number];
/** The eight the product actually assigns and displays. */
export type PaletteHue = (typeof HUES)[number];

/** Stable, well-spread assignment so two things created together look different. */
export function hueForId(id: string): PaletteHue {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  // Step by 3 around an 8-wheel: coprime, so consecutive ids land far apart.
  return HUES[(h * 3) % HUES.length] as PaletteHue;
}

/** A hue's identity mark. Used in legends, lists, and room cards. */
export const HueDot = ({ hue, className }: { hue: Hue; className?: string }) => (
  <span
    aria-hidden
    className={cn("inline-block size-2.5 rounded-full shrink-0", className)}
    style={{ background: `var(--hue-${hue}-500)` }}
  />
);

/** A tinted area keyed with readable text. Never 500 text on a light canvas. */
export function HueTag({
  hue,
  children,
  className,
}: {
  hue: Hue;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium", className)}
      style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
    >
      <HueDot hue={hue} />
      {children}
    </span>
  );
}
