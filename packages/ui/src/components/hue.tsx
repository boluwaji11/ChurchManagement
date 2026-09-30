import * as React from "react";
import { cn } from "../lib/cn";

/**
 * The spectrum. Twelve hues at matched lightness and chroma, assigned to things
 * rather than sprinkled on them: rooms, teams, group types, funds, ministries,
 * pipeline stages. Colour as data. (R24.4)
 */
export const HUES = [
  "rose", "coral", "amber", "citron", "fern", "jade",
  "teal", "sky", "indigo", "violet", "orchid", "clay",
] as const;

export type Hue = (typeof HUES)[number];

/** Stable, well-spread assignment so two things created together look different. */
export function hueForId(id: string): Hue {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  // Step by 5 around a 12-wheel: coprime, so consecutive ids land far apart.
  return HUES[(h * 5) % HUES.length] as Hue;
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
