/**
 * HRT-146. The sheets a church already owns (R16.12).
 *
 * A label sheet is the one thing in this product where being a millimetre out
 * is visible on every row of every page, and the church finds out after it has
 * fed the box through the printer. These hold the geometry against the
 * manufacturer's own numbers.
 */
import { describe, it, expect } from "vitest";
import { PAPER, PAPERS, perPage, paperCss } from "../src/lib/sheet-stock";

/** The page each stock is cut for, in millimetres. */
const CUT_FOR: Record<string, { width: number; height: number }> = {
  avery5160: { width: 215.9, height: 279.4 },
  averyL7160: { width: 210, height: 297 },
  avery5162: { width: 215.9, height: 279.4 },
  envelope: { width: 220, height: 110 },
};

describe("every stock", () => {
  it("fits its own page across", () => {
    for (const key of PAPERS) {
      const one = PAPER[key];
      const across = one.marginLeft + one.pitchX * (one.columns - 1) + one.width;
      expect(across, `${key} across`).toBeLessThanOrEqual(CUT_FOR[key]!.width);
    }
  });

  it("fits its own page down", () => {
    for (const key of PAPERS) {
      const one = PAPER[key];
      const down = one.marginTop + one.pitchY * (one.rows - 1) + one.height;
      expect(down, `${key} down`).toBeLessThanOrEqual(CUT_FOR[key]!.height);
    }
  });

  it("never overlaps its neighbour", () => {
    for (const key of PAPERS) {
      const one = PAPER[key];
      if (one.columns > 1) expect(one.pitchX, `${key} across`).toBeGreaterThanOrEqual(one.width);
      if (one.rows > 1) expect(one.pitchY, `${key} down`).toBeGreaterThanOrEqual(one.height);
    }
  });

  it("says how many it holds", () => {
    expect(perPage("avery5160")).toBe(30);
    expect(perPage("averyL7160")).toBe(21);
    expect(perPage("avery5162")).toBe(14);
    expect(perPage("envelope")).toBe(1);
  });

  it("asks the browser for no margin of its own", () => {
    for (const key of PAPERS) {
      expect(paperCss(key), key).toContain("margin: 0");
      expect(paperCss(key), key).toContain(PAPER[key].page);
    }
  });

  it("is named for what a church finds on the box", () => {
    for (const key of PAPERS) {
      expect(PAPER[key].name.length, key).toBeGreaterThan(3);
    }
  });
});
