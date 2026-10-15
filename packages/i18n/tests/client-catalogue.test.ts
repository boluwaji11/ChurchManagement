import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { en } from "../src/messages/en";
import { browserWords } from "../src/messages/client";

/**
 * R20.1, R24.11. The guard on the words the browser is given.
 *
 * The browser holds a subset, so a screen naming a word that was left out
 * would draw its key: `members.title` where the heading should be. Two things
 * stop that. The generator takes a whole group whenever a screen builds a key
 * at runtime, and this fails if the committed file no longer matches what the
 * screens name.
 */
const root = fileURLToPath(new URL("../../..", import.meta.url));
const OUT = `${root}/packages/i18n/src/messages/client.ts`;

describe("the words the browser is given", () => {
  it("is what the screens name today", () => {
    const before = readFileSync(OUT, "utf8");
    execFileSync("node", [`${root}/scripts/build-client-catalogue.mjs`], { cwd: root });
    const after = readFileSync(OUT, "utf8");

    expect(
      after === before,
      "packages/i18n/src/messages/client.ts is stale. Run `pnpm catalogue`.",
    ).toBe(true);
  });

  it("says the same words as the catalogue it came from", () => {
    for (const [key, words] of Object.entries(browserWords)) {
      expect(words).toBe(en[key as keyof typeof en]);
    }
  });

  it("leaves out what only the server writes", () => {
    /* A sample of words that are only ever rendered on the server: an email's
       footer, a giving statement, the importer. If one of these turns up in
       the browser's catalogue the saving has quietly gone. */
    expect(browserWords["send.foot.sentTo"]).toBeUndefined();
    expect(Object.keys(browserWords).length).toBeLessThan(Object.keys(en).length * 0.8);
  });
});
