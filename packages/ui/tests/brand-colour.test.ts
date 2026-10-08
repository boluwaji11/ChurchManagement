/**
 * HRT-261. A church's own colour, kept readable (R1.1, R24.4).
 *
 * The product's rule is that body text carries 4.5:1 and a UI mark carries
 * 3:1, and the twelve hues are drawn at matched lightness so that holds
 * without anybody rechecking. A church typing its own colour in is the one
 * thing that could break it, since a brand colour is picked on a logo by
 * somebody who was not thinking about a contrast ratio.
 *
 * These hold the arrangement that keeps both true: the church's hue angle is
 * carried, and the lightness is the product's.
 */
import { describe, it, expect } from "vitest";
import {
  brandRamp, hexToOklch, oklchToHex, isHex, readHex,
} from "../src/lib/brand-colour";

/** Relative luminance, the way WCAG counts it. */
function luminance(hex: string): number {
  const rgb = readHex(hex)!;
  const [r, g, b] = rgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ratio = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
};

/** An oklch() string back to a hex, so WCAG can be asked about it. */
const toHex = (css: string) => {
  const [l, c, h] = css.replace(/oklch\(|\)/g, "").split(/\s+/).map(Number);
  return oklchToHex({ l: l!, c: c!, h: h! });
};

/** Colours a church might actually hand over, pale and dark ones included. */
const BRANDS = [
  "#4f46e5", "#c2185b", "#00897b", "#ffeb3b", "#f5f5dc",
  "#1a1a2e", "#ff6f00", "#8bc34a", "#e91e63", "#03a9f4",
];

describe("reading what a church typed", () => {
  it("takes a hex with or without its hash, long or short", () => {
    expect(isHex("#4f46e5")).toBe(true);
    expect(isHex("4f46e5")).toBe(true);
    expect(isHex("#abc")).toBe(true);
    expect(isHex("  #4F46E5 ")).toBe(true);
  });

  it("refuses anything else", () => {
    for (const no of ["", "#", "red", "#12345", "#1234567", "rgb(1,2,3)"]) {
      expect(isHex(no), no).toBe(false);
    }
  });

  it("comes back as it went in", () => {
    for (const hex of BRANDS) {
      expect(oklchToHex(hexToOklch(hex)!)).toBe(hex);
    }
  });
});

describe("the ramp a colour becomes", () => {
  it("keeps the church's hue", () => {
    for (const hex of BRANDS) {
      const wanted = hexToOklch(hex)!;
      if (wanted.c < 0.02) continue;
      const got = brandRamp(hex)["500"];
      const angle = Number(got.split(/\s+/)[2]!.replace(")", ""));
      expect(Math.abs(angle - wanted.h), hex).toBeLessThan(1);
    }
  });

  it("puts every step at the product's own lightness, whatever went in", () => {
    for (const hex of BRANDS) {
      const ramp = brandRamp(hex);
      expect(ramp["100"], hex).toContain("0.937");
      expect(ramp["500"], hex).toContain("0.645");
      expect(ramp["700"], hex).toContain("0.502");
    }
  });

  it("carries 4.5:1 for a mark on its own tint, for every colour", () => {
    for (const hex of BRANDS) {
      const ramp = brandRamp(hex);
      expect(ratio(toHex(ramp.key), toHex(ramp.tint)), hex).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("carries 4.5:1 for a mark on white", () => {
    for (const hex of BRANDS) {
      expect(ratio(toHex(brandRamp(hex).key), "#ffffff"), hex).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("stays inside sRGB, so nothing is clipped to a colour nobody chose", () => {
    for (const hex of BRANDS) {
      const ramp = brandRamp(hex);
      for (const step of ["100", "500", "700", "900", "tint", "key"] as const) {
        const back = hexToOklch(toHex(ramp[step]))!;
        const asked = ramp[step].replace(/oklch\(|\)/g, "").split(/\s+/).map(Number);
        // Within a rounding step of what was asked for means sRGB held it.
        expect(Math.abs(back.l - asked[0]!), `${hex} ${step}`).toBeLessThan(0.01);
      }
    }
  });

  it("leaves a black or a white mark grey rather than inventing a hue", () => {
    for (const hex of ["#000000", "#ffffff", "#808080"]) {
      expect(brandRamp(hex)["500"], hex).toContain("0.000");
    }
  });

  it("falls back rather than failing on a colour that is not one", () => {
    expect(brandRamp("not a colour")).toEqual(brandRamp("#4f46e5"));
  });
});
