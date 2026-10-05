import tokens from "@hearth/ui/tokens/color.json";

/**
 * The spectrum as hex, for a file the product does not draw itself.
 *
 * The tokens are OKLCH because that is what keeps twelve hues at matched
 * lightness on screen. PowerPoint and Excel take sRGB hex and nothing else, so
 * the conversion happens here rather than a second palette being kept by hand
 * and drifting away from the first.
 */

/** One channel of linear light, companded to sRGB. */
const gamma = (one: number): number =>
  one <= 0.0031308 ? 12.92 * one : 1.055 * Math.pow(one, 1 / 2.4) - 0.055;

const clamp = (one: number): number => Math.min(255, Math.max(0, Math.round(one * 255)));

/** OKLCH to an sRGB hex triplet, by way of OKLab and linear sRGB. */
export function oklchToHex(lightness: number, chroma: number, hueDegrees: number): string {
  const h = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;

  const r = gamma(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = gamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);

  return [clamp(r), clamp(g), clamp(bl)]
    .map((one) => one.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

const SPECTRUM = (tokens as {
  spectrum: Record<string, Record<string, string>>;
}).spectrum;

/** What a hue's identity colour is, as the six characters a pptx wants. */
export function hueHex(hue: string, step: "100" | "500" | "700" | "900" = "500"): string {
  const value = SPECTRUM[hue]?.[step];
  const read = value?.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!read) return "4F46E5";
  return oklchToHex(Number(read[1]), Number(read[2]), Number(read[3]));
}
