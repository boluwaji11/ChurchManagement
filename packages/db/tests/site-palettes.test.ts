/**
 * HRT-380, R22.7. Every ground a church's website can be set on is readable.
 *
 * The contrast audit in packages/ui proves the product's own tokens. This
 * proves the eight a church's own website is drawn in, which nothing else
 * covers: they are not product tokens and they are the colours a visitor with
 * poor sight actually meets.
 */
import { describe, expect, it } from "vitest";
import {
  contrast, luminance, PALETTES, shortPairs, SITE_CONTRAST_PAIRS,
} from "../src/repo/site-palettes";
import { SITE_PALETTES } from "../src/repo/site-doc";

describe("the contrast helper", () => {
  it("answers 21 for black on white and 1 for a colour on itself", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#4e6c59", "#4e6c59")).toBeCloseTo(1, 5);
  });

  it("answers 21 for anything that is not a colour, so a half-typed value is quiet", () => {
    expect(contrast("#4e6", "#ffffff")).toBe(21);
    expect(contrast("", "#ffffff")).toBe(21);
  });

  it("reads luminance the way WCAG defines it", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#000000")).toBeCloseTo(0, 5);
  });
});

describe("every palette", () => {
  it("has one entry for every palette the document allows", () => {
    expect(Object.keys(PALETTES).sort()).toEqual([...SITE_PALETTES].sort());
  });

  it("clears its threshold on every pair a page sets", () => {
    const short: string[] = [];
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const one of shortPairs(palette)) short.push(`${name}: ${one}`);
    }
    expect(short).toEqual([]);
  });

  it("checks body text, quiet text, a button's label and the accent", () => {
    expect(SITE_CONTRAST_PAIRS.length).toBeGreaterThanOrEqual(8);
    expect(SITE_CONTRAST_PAIRS.some((one) => one.fore === "primaryInk")).toBe(true);
    expect(SITE_CONTRAST_PAIRS.every((one) => one.least >= 3)).toBe(true);
  });
});
