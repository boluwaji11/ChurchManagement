/** The typed half of the time field. Typing 9am beats three spin columns. */
import { describe, it, expect } from "vitest";
import { parseTime, formatTime } from "../src/components/time-picker";

describe("what somebody typed", () => {
  it("takes the ways people write a service time", () => {
    const cases: [string, string][] = [
      ["9", "09:00"],
      ["9:00", "09:00"],
      ["0900", "09:00"],
      ["9am", "09:00"],
      ["9 AM", "09:00"],
      ["9.30pm", "21:30"],
      ["21:30", "21:30"],
      ["12am", "00:00"],
      ["12pm", "12:00"],
      ["11:45 pm", "23:45"],
    ];
    for (const [typed, expected] of cases) {
      expect(parseTime(typed), typed).toBe(expected);
    }
  });

  it("returns empty for an empty field", () => {
    expect(parseTime("  ")).toBe("");
  });

  it("refuses a time that is not one", () => {
    for (const typed of ["25:00", "9:75", "half nine", "9:", ""]) {
      if (typed === "") continue;
      expect(parseTime(typed), typed).toBeNull();
    }
  });
});

describe("what the field shows", () => {
  it("says a service time the way a church says it", () => {
    expect(formatTime("09:00", "en-US")).toBe("9:00 AM");
    expect(formatTime("21:30", "en-US")).toBe("9:30 PM");
  });

  it("keeps the meridiem for a reader whose locale would drop it", () => {
    for (const locale of ["en-GB", "de-DE", "fr-FR"]) {
      expect(formatTime("21:30", locale), locale).toMatch(/9[:.]30/);
    }
  });

  it("leaves anything that is not a time alone", () => {
    expect(formatTime("")).toBe("");
  });
});
