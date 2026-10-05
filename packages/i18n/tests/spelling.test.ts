/**
 * HRT-156. Regional spelling (R22.8).
 *
 * One catalogue, written in British English, read in American where the church
 * is. The table is the only thing between the two.
 */
import { describe, it, expect, afterEach } from "vitest";
import { t, plural, setSpellingResolver, toAmerican, spellingFor } from "../src/index";

afterEach(() => setSpellingResolver(null));

describe("the word table", () => {
  it("rewrites the endings", () => {
    expect(toAmerican("colour")).toBe("color");
    expect(toAmerican("centre")).toBe("center");
    expect(toAmerican("organise")).toBe("organize");
    expect(toAmerican("licence")).toBe("license");
    expect(toAmerican("cancelled")).toBe("canceled");
    expect(toAmerican("catalogue")).toBe("catalog");
  });

  it("keeps the shape of the word it replaced", () => {
    expect(toAmerican("Colour")).toBe("Color");
    expect(toAmerican("COLOUR")).toBe("COLOR");
    expect(toAmerican("colour")).toBe("color");
  });

  it("takes the longest match, so a prefix cannot win", () => {
    expect(toAmerican("colourful")).toBe("colorful");
    expect(toAmerican("organisation")).toBe("organization");
  });

  it("leaves a word alone when the ending is not a spelling difference", () => {
    expect(toAmerican("fourth")).toBe("fourth");
    expect(toAmerican("your")).toBe("your");
    expect(toAmerican("hour")).toBe("hour");
    expect(toAmerican("metrics")).toBe("metrics");
  });

  it("works inside a sentence", () => {
    expect(toAmerican("Choose a colour from the list.")).toBe("Choose a color from the list.");
  });
});

describe("which spelling a church reads", () => {
  it("is American where the church writes that way", () => {
    expect(spellingFor("US")).toBe("american");
    expect(spellingFor("us")).toBe("american");
    expect(spellingFor("PH")).toBe("american");
  });

  it("is the catalogue's own everywhere else, and with nothing on the record", () => {
    expect(spellingFor("GB")).toBe("british");
    expect(spellingFor("NG")).toBe("british");
    expect(spellingFor("CA")).toBe("british");
    expect(spellingFor(null)).toBe("british");
  });
});

describe("reading a message", () => {
  it("answers as the catalogue is written with nobody asked", () => {
    expect(t("form.colour")).toBe("Colour");
  });

  it("answers in American for a church that reads that way", () => {
    setSpellingResolver(() => "american");
    expect(t("form.colour")).toBe("Color");
  });

  it("does the same for a plural", () => {
    setSpellingResolver(() => "american");
    expect(plural("event.placesLeft", 2)).toBe("2 seats left");
  });

  it("leaves the words as written when the resolver cannot answer", () => {
    setSpellingResolver(() => {
      throw new Error("outside a request");
    });
    expect(t("form.colour")).toBe("Colour");
  });
});
