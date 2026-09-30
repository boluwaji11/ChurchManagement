/**
 * HRT-36, R22.8.
 *
 * Two things are worth testing about a catalogue. That the lookup works, and
 * that the catalogue itself has not rotted: an unused key is dead weight a
 * translator gets paid to translate, and a plural stem missing its `.other` is a
 * blank space on a screen in a locale nobody on the team reads.
 */
import { describe, it, expect } from "vitest";
import { t, plural, en, LOCALES, DEFAULT_LOCALE } from "../src/index";

describe("lookup", () => {
  it("returns the message", () => {
    expect(t("people.title")).toBe("Directory");
  });

  it("fills in values", () => {
    expect(t("signIn.sent.body", { email: "grace@example.org" })).toBe(
      "We sent a sign-in link to grace@example.org. It is good for one hour.",
    );
  });

  it("leaves a placeholder alone when nothing was passed for it", () => {
    // Better a visible {email} than the word "undefined" in a sentence.
    expect(t("signIn.sent.body")).toContain("{email}");
  });

  it("composes a permission message from its two halves", () => {
    expect(t("error.permission", { role: "staff", action: t("error.permission.archivePerson") })).toBe(
      "The staff role cannot archive a person.",
    );
  });
});

describe("plurals", () => {
  it("picks the form the locale asks for", () => {
    expect(plural("tags.peopleCount", 1)).toBe("1 person");
    expect(plural("tags.peopleCount", 7)).toBe("7 people");
    // Zero takes the plural in English, which is the case a hand written
    // ternary on n === 1 gets right by accident and other locales get wrong.
    expect(plural("tags.peopleCount", 0)).toBe("0 people");
  });

  it("always exposes the count without being passed it", () => {
    expect(plural("tags.peopleCount", 3)).toBe("3 people");
  });

  it("has an .other form for every plural stem", () => {
    const stems = new Set(
      Object.keys(en)
        .filter((k) => /\.(zero|one|two|few|many|other)$/.test(k))
        .map((k) => k.slice(0, k.lastIndexOf("."))),
    );
    expect(stems.size).toBeGreaterThan(0);
    for (const stem of stems) {
      expect(Object.keys(en), `${stem} has no .other form`).toContain(`${stem}.other`);
    }
  });
});

describe("the catalogue itself", () => {
  it("has no blank messages", () => {
    const blank = Object.entries(en).filter(([, v]) => v.trim() === "");
    expect(blank.map(([k]) => k)).toEqual([]);
  });

  it("has no em dashes or en dashes", () => {
    const offenders = Object.entries(en)
      .filter(([, v]) => v.includes("\u2014") || v.includes("\u2013"))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
  });

  it("uses lowerCamel dotted keys throughout, so the file stays sortable", () => {
    const malformed = Object.keys(en).filter((k) => !/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_/+-]+)+$/.test(k));
    expect(malformed).toEqual([]);
  });

  it("ships exactly one complete locale in v1", () => {
    expect(LOCALES).toEqual([DEFAULT_LOCALE]);
  });
});
