import { brandRamp, type BrandRamp } from "@connectapp/ui";

/**
 * R1.1, R24.4. One answer to "what colour is this church", for every screen
 * that wears one.
 *
 * A church either picked a colour or it did not. Where it did, the colour is
 * read for its hue and the ramp is rebuilt at the product's own lightness, so
 * a pale brand cannot put unreadable words on a giving page. Where it did
 * not, the hue it was given out of the spectrum stands in and the ramp comes
 * out identical to the spectrum's own.
 */

/** The eight the product ships, as the colours they stand for. */
const SPECTRUM: Record<string, string> = {
  rose: "#d4374f", amber: "#c87a0a", citron: "#8a8f12", fern: "#1e8a4c",
  teal: "#0d8694", sky: "#1877c4", indigo: "#4f46e5", violet: "#8339d9",
  coral: "#d05a2a", jade: "#118a72", orchid: "#b63a9e", clay: "#8a6248",
};

/** What a church's colour is, as a `#rrggbb`, picked or inherited. */
export function brandHexOf(
  church: { brandColor?: string | null; brandHue?: string | null } | null | undefined,
): string {
  return church?.brandColor || SPECTRUM[church?.brandHue ?? "indigo"] || SPECTRUM["indigo"]!;
}

/** And the ramp drawn from it. */
export const brandOf = (
  church: { brandColor?: string | null; brandHue?: string | null } | null | undefined,
): BrandRamp => brandRamp(brandHexOf(church));
