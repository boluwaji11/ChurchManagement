/**
 * HRT-57. The security code (R8.6).
 *
 * This is the string standing between a child and the wrong adult. The tests
 * are about the two ways it fails: a code somebody can predict, and a code a
 * volunteer reads wrong.
 */
import { describe, it, expect } from "vitest";
import { newCode, readCode, looksLikeCode, CODE_LENGTH } from "../src/repo/codes";

describe("the code", () => {
  it("is the length printed on the label", () => {
    expect(newCode()).toHaveLength(CODE_LENGTH);
  });

  it("leaves out every character read wrong at a glance", () => {
    // Ten thousand of them, so a stray character would have to be very shy to
    // hide. No O beside 0, no I or L beside 1, no S beside 5.
    const forbidden = /[01ILOS]/;
    for (let i = 0; i < 10_000; i += 1) {
      expect(newCode(), "run " + i).not.toMatch(forbidden);
    }
  });

  it("does not count up, so one code says nothing about the next", () => {
    const codes = Array.from({ length: 2000 }, () => newCode());
    const unique = new Set(codes);
    // Collisions at this sample size would mean far too little randomness.
    expect(unique.size).toBeGreaterThan(1990);

    // Every position varies. A generator stuck on a prefix would fail here.
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      const atPosition = new Set(codes.map((c) => c[i]));
      expect(atPosition.size, `position ${i}`).toBeGreaterThan(10);
    }
  });

  it("forgives how somebody types it back in", () => {
    expect(readCode(" k7q m2 ")).toBe("K7QM2");
    expect(readCode("k7-qm2")).toBe("K7QM2");
  });

  it("knows what cannot be a code before the database is asked", () => {
    expect(looksLikeCode(newCode())).toBe(true);
    expect(looksLikeCode("K7Q")).toBe(false);
    expect(looksLikeCode("K7QM2X")).toBe(false);
    // Characters the alphabet leaves out cannot have been printed.
    expect(looksLikeCode("K0QM2")).toBe(false);
    expect(looksLikeCode("KIQM2")).toBe(false);
  });
});
