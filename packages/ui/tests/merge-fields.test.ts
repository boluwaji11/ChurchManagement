/**
 * HRT-267. The marks in a mail-merge letter (R16.12).
 *
 * A letter goes in an envelope and through a post box. A mark that silently
 * vanishes leaves a sentence that reads fine and means something else, and
 * nobody finds out until a hundred of them are in the hands of the
 * congregation.
 */
import { describe, it, expect } from "vitest";
import { merge, marksIn, unknownMarks, MERGE_FIELDS } from "../src/lib/merge-fields";

describe("putting a household's words into a letter", () => {
  it("replaces every mark it knows", () => {
    const out = merge("Dear {name}, from {church}.", {
      name: "The Adlers",
      church: "Riverside Fellowship",
    });
    expect(out).toBe("Dear The Adlers, from Riverside Fellowship.");
  });

  it("leaves a mark it does not know exactly as typed", () => {
    expect(merge("Dear {nickname},", { name: "x" })).toBe("Dear {nickname},");
  });

  it("leaves a known mark alone when nothing was given for it", () => {
    expect(merge("Dear {name},", {})).toBe("Dear {name},");
  });

  it("does not read a value as a mark", () => {
    // A household that happens to be called {church} is posted to under that
    // name, not under the church's.
    const out = merge("Dear {name},", { name: "{church}", church: "Riverside" });
    expect(out).toBe("Dear {church},");
  });

  it("replaces a mark that appears more than once", () => {
    expect(merge("{name} and {name}", { name: "Ada" })).toBe("Ada and Ada");
  });

  it("leaves a brace that is not a mark alone", () => {
    for (const no of ["{ name }", "{Name}", "{na me}", "{}", "{name", "name}"]) {
      expect(merge(no, { name: "Ada" }), no).toBe(no);
    }
  });

  it("keeps the lines a church typed", () => {
    expect(merge("Dear {name},\n\nCome on Sunday.", { name: "Ada" }))
      .toBe("Dear Ada,\n\nCome on Sunday.");
  });
});

describe("what a template asks for", () => {
  it("lists its marks once each, in order", () => {
    expect(marksIn("{church} wrote to {name}. Yours, {church}."))
      .toEqual(["church", "name"]);
  });

  it("names the ones this product cannot fill", () => {
    expect(unknownMarks("Dear {name}, your {nickname} and {balance}"))
      .toEqual(["nickname", "balance"]);
    expect(unknownMarks("Dear {name},")).toEqual([]);
  });

  it("knows every field it offers", () => {
    const all = MERGE_FIELDS.map((one) => `{${one}}`).join(" ");
    expect(unknownMarks(all)).toEqual([]);
  });
});
