import { describe, it, expect } from "vitest";
import { pageTokens } from "../src/lib/pages";

/** R2.14, R24.6. The row of numbers both pagers draw. */
describe("the pages a pager draws", () => {
  it("draws every page of a short list", () => {
    expect(pageTokens(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the first and the last, and the ones underfoot", () => {
    expect(pageTokens(1, 31)).toEqual([1, 2, null, 31]);
    expect(pageTokens(16, 31)).toEqual([1, null, 15, 16, 17, null, 31]);
    expect(pageTokens(31, 31)).toEqual([1, null, 30, 31]);
  });

  it("never draws more than seven slots", () => {
    for (let page = 1; page <= 40; page += 1) {
      expect(pageTokens(page, 40).length).toBeLessThanOrEqual(7);
    }
  });

  it("draws each page once, in order", () => {
    const drawn = pageTokens(10, 20).filter((one): one is number => one !== null);
    expect([...new Set(drawn)]).toEqual(drawn);
    expect([...drawn].sort((a, b) => a - b)).toEqual(drawn);
  });

  it("draws nothing for a list that fits on one page", () => {
    expect(pageTokens(1, 1)).toEqual([1]);
    expect(pageTokens(1, 0)).toEqual([]);
  });
});
