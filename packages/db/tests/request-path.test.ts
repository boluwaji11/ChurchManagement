/**
 * A guard, not a unit test.
 *
 * Row-level security constrains the application role. It does not constrain the
 * owner. So the isolation guarantee holds only as long as no request path uses
 * the owner connection, and that is a property of the code rather than of the
 * database. This test makes it a build failure instead of a review habit.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const webRoot = resolve(import.meta.dirname, "../../../apps/web");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
  }
  return out;
}

describe("the owner connection never reaches a request path", () => {
  it("is not imported anywhere in the web app", () => {
    const offenders = walk(webRoot).filter((file) =>
      /\bimport\s*\{[^}]*\bowner\b[^}]*\}\s*from\s*["']@hearth\/db["']/.test(readFileSync(file, "utf8")),
    );
    expect(offenders.map((f) => f.replace(webRoot, "apps/web"))).toEqual([]);
  });

  it("reaches the database through withTenant in the web app", () => {
    const usesDb = walk(webRoot).filter((f) => /@hearth\/db/.test(readFileSync(f, "utf8")));
    expect(usesDb.length).toBeGreaterThan(0);
    for (const file of usesDb) {
      const source = readFileSync(file, "utf8");
      // A file may import types or the pre-authorization lookup without querying.
      const queries = /\blistPeople\b|\blistNotesForPerson\b|\bcountPeopleByStatus\b/.test(source);
      if (queries) {
        expect(source, `${file} queries without withTenant`).toMatch(/withTenant/);
      }
    }
  });
});
