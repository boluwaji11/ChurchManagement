/**
 * HRT-61. The label stock a church owns (R8.25, R8.26).
 *
 * Printing goes through the browser, so the page size is the only thing
 * standing between a correct label and a label printed in the middle of an A4
 * sheet. These are the numbers, asserted, because a typo in a millimetre is a
 * Sunday morning of unusable labels and nobody notices until the roll is on.
 */
import { describe, it, expect } from "vitest";
import { STOCK, STOCKS, stockOf, printCss } from "../src/lib/label-stock";

describe("which stock a station is on", () => {
  it("knows the two printers this segment owns, and paper", () => {
    expect([...STOCKS]).toEqual(["brother", "dymo", "paper"]);
  });

  it("falls back to paper for anything it does not recognise", () => {
    expect(stockOf("brother")).toBe("brother");
    expect(stockOf("dymo")).toBe("dymo");
    expect(stockOf("zebra")).toBe("paper");
    expect(stockOf(null)).toBe("paper");
    expect(stockOf(undefined)).toBe("paper");
  });
});

describe("the page the label is printed on", () => {
  it("is the Brother DK-22205 tape, 62mm wide", () => {
    expect(STOCK.brother.width).toBe(62);
    expect(printCss("brother")).toContain("@page { size: 62mm 40mm; margin: 0; }");
  });

  it("is the Dymo 30252 address label, 89 by 28", () => {
    expect(STOCK.dymo.width).toBe(89);
    expect(STOCK.dymo.height).toBe(28);
    expect(printCss("dymo")).toContain("@page { size: 89mm 28mm; margin: 0; }");
  });

  it("lets a roll size its own page, and leaves a sheet alone", () => {
    expect(STOCK.brother.roll).toBe(true);
    expect(STOCK.dymo.roll).toBe(true);
    expect(STOCK.paper.roll).toBe(false);
    expect(printCss("paper")).toContain("size: auto");
    expect(printCss("paper")).toContain("margin: 10mm");
  });

  it("puts one label on a roll page and many on a sheet", () => {
    expect(printCss("brother")).toContain("break-after: page");
    expect(printCss("dymo")).toContain("break-after: page");
    expect(printCss("paper")).not.toContain("break-after: page");
  });

  it("gives a church with no label printer something to cut along (R8.26)", () => {
    expect(printCss("paper")).toContain("dashed");
  });
});
