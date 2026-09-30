/**
 * The contrast audit, as a test (R22.7, N7).
 *
 * The 0.1 exit criteria say the contrast audit passes in CI. This is the audit.
 * It reads the OKLCH source rather than a screenshot, so it proves a token pair
 * can never be wrong, not that one page looked fine on the day it ran.
 *
 * It found four real defects the first time it ran: control borders at 1.45:1,
 * caption text in dark mode at 3.84:1, and four hues whose text step could not
 * be read on its own tint.
 */
import { describe, it, expect } from "vitest";
// @ts-expect-error plain JavaScript, shared with the build script and the CLI report
import { audit } from "../scripts/contrast.mjs";

interface Result {
  label: string;
  ratio: number;
  min: number;
  passes: boolean;
}

describe("colour contrast", () => {
  const results = audit() as Result[];

  it("checks both themes and every pair the product ships", () => {
    expect(results.length).toBeGreaterThan(40);
    expect(results.some((r) => r.label.startsWith("light:"))).toBe(true);
    expect(results.some((r) => r.label.startsWith("dark:"))).toBe(true);
  });

  it("meets its threshold on every pair", () => {
    const failed = results
      .filter((r) => !r.passes)
      .map((r) => `${r.label}: ${r.ratio}:1, needs ${r.min}:1`);
    expect(failed).toEqual([]);
  });
});
