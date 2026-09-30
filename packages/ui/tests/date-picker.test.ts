/**
 * The typed half of the date field. A volunteer entering a date of birth in
 * 1954 types it; the calendar is for the dates people would rather point at.
 */
import { describe, it, expect } from "vitest";
import { parseTyped } from "../src/components/date-picker";

describe("what somebody typed", () => {
  it("takes the ISO form as it is", () => {
    expect(parseTyped("2026-09-30", "en-US")).toBe("2026-09-30");
  });

  it("takes the short form the field prints, and common separators", () => {
    for (const typed of ["09/30/2026", "9/30/2026", "09-30-2026", "9.30.2026"]) {
      expect(parseTyped(typed, "en-US"), typed).toBe("2026-09-30");
    }
  });

  it("reads day and month in the reader's order", () => {
    expect(parseTyped("03/04/2026", "en-US")).toBe("2026-03-04");
    expect(parseTyped("03/04/2026", "en-GB")).toBe("2026-04-03");
  });

  it("reads a two digit year as the century that makes sense", () => {
    expect(parseTyped("06/14/54", "en-US")).toBe("1954-06-14");
    expect(parseTyped("06/14/26", "en-US")).toBe("2026-06-14");
  });

  it("returns empty for an empty field", () => {
    expect(parseTyped("   ", "en-US")).toBe("");
  });

  it("refuses a date that is not one", () => {
    for (const typed of ["hello", "13/45/2026", "2026-02-30", "1/2"]) {
      expect(parseTyped(typed, "en-US"), typed).toBeNull();
    }
  });
});
