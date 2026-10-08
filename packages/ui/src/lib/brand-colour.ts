/**
 * R1.1, R24.4. A church's own colour, made safe to use.
 *
 * The twelve hues in the spectrum are matched for lightness and chroma so one
 * can be swapped for another without anybody checking contrast again. A church
 * that types in its own colour is outside that promise: brand colours are
 * chosen on a logo, against white, by somebody who was not thinking about a
 * 4.5:1 body ratio, and half of them are too pale to put a word on.
 *
 * So a colour is taken for its hue and nothing else. The angle is what a
 * church recognises as theirs, and the ramp is rebuilt at the spectrum's own
 * lightness steps with the spectrum's own chroma, pulled in to whatever that
 * angle can actually reach in sRGB. The church gets its colour and the
 * product keeps its contrast, which is the only arrangement where both are
 * true.
 *
 * The maths is Björn Ottosson's OKLab, written out rather than depended on:
 * it is forty lines and this package ships to a browser.
 */

export interface Oklch {
  /** Perceived lightness, 0 to 1. */
  l: number;
  /** Chroma, 0 upwards, where about 0.37 is the most sRGB holds. */
  c: number;
  /** Hue angle in degrees. */
  h: number;
}

/** The lightness and chroma each step of the spectrum is drawn at. */
const STEPS = {
  "100": { l: 0.937, c: 0.044 },
  "500": { l: 0.645, c: 0.148 },
  "700": { l: 0.502, c: 0.132 },
  "900": { l: 0.380, c: 0.092 },
} as const;

export type BrandStep = keyof typeof STEPS;

/** What a church's colour becomes once it is safe to put words on. */
export interface BrandRamp extends Record<BrandStep, string> {
  /** The pale ground a mark sits on. */
  tint: string;
  /** The colour of the mark itself, which carries 4.5:1 on that ground. */
  key: string;
}

const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));

/** sRGB, as written in a hex, to the linear light it stands for. */
const straighten = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** And back, which is what a screen is given. */
const bend = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

/** "#4f46e5" or "4f46e5", in any case, to three numbers. Null if it is not one. */
export function readHex(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((d) => d + d).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

/** Whether a church typed something this can use. */
export const isHex = (hex: string): boolean => readHex(hex) !== null;

export function hexToOklch(hex: string): Oklch | null {
  const rgb = readHex(hex);
  if (!rgb) return null;

  const [r, g, b] = rgb.map(straighten) as [number, number, number];

  const long = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mid = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const lightness = 0.2104542553 * long + 0.7936177850 * mid - 0.0040720468 * short;
  const greenRed = 1.9779984951 * long - 2.4285922050 * mid + 0.4505937099 * short;
  const blueYellow = 0.0259040371 * long + 0.7827717662 * mid - 0.8086757660 * short;

  const chroma = Math.hypot(greenRed, blueYellow);
  const angle = (Math.atan2(blueYellow, greenRed) * 180) / Math.PI;

  return { l: lightness, c: chroma, h: (angle + 360) % 360 };
}

/** The linear channels a colour asks for, which may be outside what sRGB holds. */
function channels({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const greenRed = c * Math.cos(rad);
  const blueYellow = c * Math.sin(rad);

  const long = (l + 0.3963377774 * greenRed + 0.2158037573 * blueYellow) ** 3;
  const mid = (l - 0.1055613458 * greenRed - 0.0638541728 * blueYellow) ** 3;
  const short = (l - 0.0894841775 * greenRed - 1.2914855480 * blueYellow) ** 3;

  return [
    4.0767416621 * long - 3.3077115913 * mid + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * mid - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * mid + 1.7076147010 * short,
  ];
}

const holds = (colour: Oklch) =>
  channels(colour).every((one) => one >= -0.0001 && one <= 1.0001);

/**
 * The most chroma this hue can carry at this lightness.
 *
 * Yellow runs out of room long before blue does, so a ramp that asked every
 * hue for the same chroma would hand back colours sRGB cannot draw, and the
 * browser would clip them to something nobody chose.
 */
function reachable(l: number, c: number, h: number): number {
  if (holds({ l, c, h })) return c;

  let low = 0;
  let high = c;
  for (let n = 0; n < 18; n += 1) {
    const mid = (low + high) / 2;
    if (holds({ l, c: mid, h })) low = mid;
    else high = mid;
  }
  return low;
}

export function oklchToHex({ l, c, h }: Oklch): string {
  const hex = channels({ l, c, h })
    .map((one) => Math.round(clamp(bend(clamp(one))) * 255).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

/** How a colour is written for CSS, rounded the way the token file writes them. */
const say = ({ l, c, h }: Oklch) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(0)})`;

/**
 * R1.1, R24.4. A church's colour, as the four steps and the two marks.
 *
 * Anything that is not a colour comes back as the fallback's ramp rather than
 * as nothing, because a church with a typo in its settings should still have
 * a readable giving page.
 */
export function brandRamp(hex: string, fallback = "#4f46e5"): BrandRamp {
  const source = hexToOklch(hex) ?? hexToOklch(fallback)!;
  const h = source.h;

  /*
   * A church whose mark is black, white or a grey keeps it. There is no hue
   * in those to carry, and the angle `atan2` returns for them is noise: a
   * church that typed #000000 would otherwise find itself wearing red.
   */
  const grey = source.c < 0.02;
  const pull = (l: number, c: number) => (grey ? 0 : reachable(l, c, h));

  const at = (step: BrandStep) => {
    const want = STEPS[step];
    return { l: want.l, c: pull(want.l, want.c), h: grey ? 0 : h };
  };

  const tint = { l: 0.962, c: pull(0.962, 0.030), h: grey ? 0 : h };

  return {
    "100": say(at("100")),
    "500": say(at("500")),
    "700": say(at("700")),
    "900": say(at("900")),
    tint: say(tint),
    key: say(at("700")),
  };
}

/** The same, as the custom properties a page sets on itself. */
export function brandVars(hex: string): Record<string, string> {
  const ramp = brandRamp(hex);
  return {
    "--brand-100": ramp["100"],
    "--brand-500": ramp["500"],
    "--brand-700": ramp["700"],
    "--brand-900": ramp["900"],
    "--brand-tint": ramp.tint,
    "--brand-key": ramp.key,
  };
}
