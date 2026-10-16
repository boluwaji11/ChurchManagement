/**
 * HRT-380, R22.2, R24.6. A church website's own colours, type and shapes.
 *
 * The published page is not the admin product wearing a different hue. It gets
 * its own set of custom properties, written onto the element that wraps the
 * page, and every section reads those rather than the product's tokens. That is
 * what lets a church's site look like a church's site, and it is why the editor
 * canvas looks like the published page: both wrap the same components in the
 * same properties.
 *
 * Pure, so the editor can recompute the whole page's look while somebody drags
 * a colour slider, with no round trip.
 */

import type { CSSProperties } from "react";
import {
  PALETTES, type Palette, type PairingKey, type SiteTheme,
} from "@connectapp/db/rules";

export interface Pairing {
  /** The CSS variable the display face is served under. */
  display: string;
  body: string;
  /** How the display face is set: some want tighter tracking than others. */
  displayTracking: string;
  /** Whether the display face is a serif, which changes the optical sizes. */
  serif: boolean;
}

export const PAIRINGS: Record<PairingKey, Pairing> = {
  editorial: { display: "var(--site-font-fraunces)", body: "var(--site-font-inter)", displayTracking: "-0.02em", serif: true },
  geometric: { display: "var(--site-font-outfit)", body: "var(--site-font-inter)", displayTracking: "-0.03em", serif: false },
  classical: { display: "var(--site-font-playfair)", body: "var(--site-font-lora)", displayTracking: "-0.01em", serif: true },
  humanist: { display: "var(--site-font-source-serif)", body: "var(--site-font-source-sans)", displayTracking: "-0.015em", serif: true },
  grotesque: { display: "var(--site-font-archivo)", body: "var(--site-font-archivo)", displayTracking: "-0.035em", serif: false },
  literary: { display: "var(--site-font-garamond)", body: "var(--site-font-work-sans)", displayTracking: "0em", serif: true },
};

const SCALE: Record<SiteTheme["typeScale"], { hero: string; h2: string; h3: string; body: string }> = {
  compact: {
    hero: "clamp(34px, 4.6vw, 54px)",
    h2: "clamp(25px, 2.5vw, 34px)",
    h3: "19px",
    body: "16px",
  },
  regular: {
    hero: "clamp(40px, 6vw, 72px)",
    h2: "clamp(29px, 3.1vw, 42px)",
    h3: "21px",
    body: "17px",
  },
  grand: {
    hero: "clamp(46px, 7.4vw, 92px)",
    h2: "clamp(33px, 3.8vw, 52px)",
    h3: "23px",
    body: "18px",
  },
};

const WEIGHT: Record<SiteTheme["headingWeight"], string> = {
  light: "300", regular: "400", medium: "600", bold: "700",
};

const CORNERS: Record<SiteTheme["corners"], string> = {
  square: "0px", soft: "14px", round: "26px",
};

const IMAGE_CORNERS: Record<SiteTheme["images"], string> = {
  square: "0px", soft: "18px", round: "32px",
};

const BUTTON_SHAPE: Record<SiteTheme["buttons"]["shape"], string> = {
  square: "2px", soft: "10px", pill: "999px",
};

const WIDTH: Record<SiteTheme["width"], string> = {
  narrow: "1040px", regular: "1200px", wide: "1360px",
};

/** How much air a section has above and below it. */
const RHYTHM: Record<SiteTheme["rhythm"], { pad: string; gap: string }> = {
  compact: { pad: "clamp(40px, 5vw, 64px)", gap: "20px" },
  regular: { pad: "clamp(56px, 7vw, 104px)", gap: "28px" },
  airy: { pad: "clamp(72px, 9vw, 148px)", gap: "36px" },
};

const CARDS: Record<SiteTheme["cards"], { border: string; shadow: string }> = {
  line: { border: "1px solid var(--s-line)", shadow: "none" },
  shadow: { border: "1px solid transparent", shadow: "0 18px 40px -28px rgba(16,14,12,0.45)" },
  flat: { border: "1px solid transparent", shadow: "none" },
};

/** A hex colour with an alpha channel, for a wash over a photograph. */
export { PALETTES };
export type { Palette };

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** The palette a theme resolves to, with whatever the church changed by hand. */
export function paletteFor(theme: SiteTheme): Palette {
  return { ...PALETTES[theme.palette], ...theme.colors };
}

/**
 * The custom properties a website is drawn with.
 *
 * Returned as a plain object so it can go straight onto a `style` attribute,
 * which is what makes the editor's canvas repaint as a slider moves without
 * writing a stylesheet or touching the document.
 */
export function themeStyle(theme: SiteTheme): CSSProperties {
  const palette = paletteFor(theme);
  const pairing = PAIRINGS[theme.fonts];
  const scale = SCALE[theme.typeScale];
  const rhythm = RHYTHM[theme.rhythm];
  const cards = CARDS[theme.cards];
  return {
    "--s-bg": palette.bg,
    "--s-surface": palette.surface,
    "--s-ink": palette.ink,
    "--s-muted": palette.muted,
    "--s-line": palette.line,
    "--s-primary": palette.primary,
    "--s-primary-ink": palette.primaryInk,
    "--s-accent": palette.accent,
    /* A wash of the primary, for a quiet band or a card behind a value. */
    "--s-primary-soft": withAlpha(palette.primary, palette.dark ? 0.18 : 0.08),
    "--s-accent-soft": withAlpha(palette.accent, palette.dark ? 0.2 : 0.1),
    "--s-ink-soft": withAlpha(palette.ink, 0.06),
    "--s-display": pairing.display,
    "--s-body": pairing.body,
    "--s-display-tracking": pairing.displayTracking,
    "--s-display-weight": WEIGHT[theme.headingWeight],
    "--s-hero": scale.hero,
    "--s-h2": scale.h2,
    "--s-h3": scale.h3,
    "--s-text": scale.body,
    "--s-corner": CORNERS[theme.corners],
    "--s-image-corner": IMAGE_CORNERS[theme.images],
    "--s-button-corner": BUTTON_SHAPE[theme.buttons.shape],
    "--s-width": WIDTH[theme.width],
    "--s-pad": rhythm.pad,
    "--s-gap": rhythm.gap,
    "--s-card-border": cards.border,
    "--s-card-shadow": cards.shadow,
  } as CSSProperties;
}

/** The presets a church chooses before it touches anything by hand. */
export interface SitePreset {
  key: string;
  theme: Pick<SiteTheme,
    "palette" | "fonts" | "typeScale" | "headingWeight" | "corners"
    | "buttons" | "width" | "rhythm" | "cards" | "images">;
}

export const SITE_PRESETS: SitePreset[] = [
  {
    key: "warm",
    theme: {
      palette: "stone", fonts: "editorial", typeScale: "regular", headingWeight: "regular",
      corners: "soft", buttons: { shape: "soft", secondary: "outline" },
      width: "regular", rhythm: "regular", cards: "line", images: "soft",
    },
  },
  {
    key: "bold",
    theme: {
      palette: "forest", fonts: "grotesque", typeScale: "grand", headingWeight: "bold",
      corners: "square", buttons: { shape: "square", secondary: "soft" },
      width: "wide", rhythm: "compact", cards: "flat", images: "square",
    },
  },
  {
    key: "traditional",
    theme: {
      palette: "ivory", fonts: "classical", typeScale: "regular", headingWeight: "regular",
      corners: "square", buttons: { shape: "square", secondary: "quiet" },
      width: "narrow", rhythm: "airy", cards: "line", images: "square",
    },
  },
  {
    key: "calm",
    theme: {
      palette: "sand", fonts: "literary", typeScale: "compact", headingWeight: "light",
      corners: "round", buttons: { shape: "pill", secondary: "quiet" },
      width: "narrow", rhythm: "airy", cards: "flat", images: "round",
    },
  },
  {
    key: "modern",
    theme: {
      palette: "harbour", fonts: "geometric", typeScale: "regular", headingWeight: "medium",
      corners: "soft", buttons: { shape: "pill", secondary: "soft" },
      width: "regular", rhythm: "regular", cards: "shadow", images: "soft",
    },
  },
  {
    key: "evening",
    theme: {
      palette: "dusk", fonts: "humanist", typeScale: "regular", headingWeight: "medium",
      corners: "soft", buttons: { shape: "soft", secondary: "outline" },
      width: "regular", rhythm: "regular", cards: "line", images: "soft",
    },
  },
];
