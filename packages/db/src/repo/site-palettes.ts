/**
 * HRT-380, R22.2, R22.7. The grounds a church's website can be set on.
 *
 * Pure data, held beside the document's own shape rather than in the screen
 * that paints it, because the contrast of every pair here is a promise the
 * product makes and a promise is a test. `packages/db/tests/site-palettes.test.ts`
 * walks them, so a palette cannot be tuned into something a visitor cannot read.
 */

import type { PaletteKey } from "./site-doc";

export interface Palette {
  /** The page's ground. */
  bg: string;
  /** A card or a band that lifts off the ground. */
  surface: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  /** What is legible on the primary. */
  primaryInk: string;
  accent: string;
  /** Whether this palette is a dark one, which decides a few treatments. */
  dark?: true;
}

/**
 * Eight grounds, each one a whole look rather than a hue swap.
 *
 * Every pair here clears 4.5:1 for body text and 3:1 for a control, measured
 * with the same contrast test the design gallery runs. A church can change any
 * one of them by hand afterwards and the editor says when a pair stops clearing.
 */
export const PALETTES: Record<PaletteKey, Palette> = {
  stone: {
    bg: "#faf7f1", surface: "#ffffff", ink: "#24221e", muted: "#5d5a52",
    line: "#e6dfd3", primary: "#7d4f2d", primaryInk: "#fffaf4", accent: "#44614f",
  },
  forest: {
    bg: "#f4f5ef", surface: "#ffffff", ink: "#182519", muted: "#475044",
    line: "#dce0d3", primary: "#2b4631", primaryInk: "#f6f5ec", accent: "#8a6a1b",
  },
  ivory: {
    bg: "#fffdf8", surface: "#ffffff", ink: "#221d19", muted: "#59524a",
    line: "#e9e2d4", primary: "#1d3147", primaryInk: "#ffffff", accent: "#8a2d37",
  },
  dusk: {
    bg: "#14161a", surface: "#1e2127", ink: "#f3f2ef", muted: "#b2b7c0",
    line: "#2e333b", primary: "#dfa257", primaryInk: "#191b1f", accent: "#8fa9d4",
    dark: true,
  },
  clay: {
    bg: "#fbf6f2", surface: "#ffffff", ink: "#271f1b", muted: "#64544c",
    line: "#ecdfd5", primary: "#a63f1c", primaryInk: "#fff8f4", accent: "#2f615c",
  },
  harbour: {
    bg: "#f3f7f9", surface: "#ffffff", ink: "#13202a", muted: "#475a66",
    line: "#d8e1e7", primary: "#0f4e5e", primaryInk: "#f2fafc", accent: "#c25a22",
  },
  sand: {
    bg: "#f7f3e8", surface: "#fffdf6", ink: "#282419", muted: "#5f5945",
    line: "#e4dbc4", primary: "#5f5228", primaryInk: "#fffdf6", accent: "#9a4d26",
  },
  slate: {
    bg: "#f6f7f8", surface: "#ffffff", ink: "#181b1f", muted: "#4f555d",
    line: "#dee1e5", primary: "#263040", primaryInk: "#ffffff", accent: "#9c5529",
  },
};


/* ------------------------------------------------------------- contrast --- */

/** A colour's relative luminance, as WCAG defines it. */
export function luminance(hex: string): number {
  const parts = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  const [r, g, b] = parts.map((one) =>
    (one <= 0.03928 ? one / 12.92 : ((one + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/**
 * The contrast between two colours, as a ratio.
 *
 * Anything that is not a six-digit hex value answers 21, which is what keeps a
 * warning from flashing in the editor while somebody is half way through typing
 * one.
 */
export function contrast(one: string, two: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(one) || !/^#[0-9a-fA-F]{6}$/.test(two)) return 21;
  const [high, low] = [luminance(one), luminance(two)].sort((a, b) => b - a);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

/**
 * The pairs a page actually sets, and what each one has to clear.
 *
 * Body text and quiet text at 4.5:1, a control and an accent at 3:1, and the
 * ink on the primary at 4.5:1 because a button's label is body text sitting on
 * a coloured ground.
 */
export const SITE_CONTRAST_PAIRS: {
  fore: keyof Palette; back: keyof Palette; least: number;
}[] = [
  { fore: "ink", back: "bg", least: 4.5 },
  { fore: "ink", back: "surface", least: 4.5 },
  { fore: "muted", back: "bg", least: 4.5 },
  { fore: "muted", back: "surface", least: 4.5 },
  { fore: "primaryInk", back: "primary", least: 4.5 },
  { fore: "primary", back: "bg", least: 3 },
  { fore: "primary", back: "surface", least: 3 },
  { fore: "accent", back: "bg", least: 3 },
];

/** Every pair of a palette that does not clear, named. */
export function shortPairs(palette: Palette): string[] {
  return SITE_CONTRAST_PAIRS
    .filter(({ fore, back, least }) =>
      contrast(String(palette[fore]), String(palette[back])) < least)
    .map(({ fore, back, least }) =>
      `${fore} on ${back}: ${contrast(String(palette[fore]), String(palette[back])).toFixed(2)}, wants ${least}`);
}
