/**
 * HRT-206, R24.17. An empty screen wears the church's mark.
 *
 * `Empty` reads the church's logo out of the shell and falls back to an icon
 * naming what is missing. A screen that draws its own mark instead gets the
 * icon and never the logo, and nobody notices until a church with a logo opens
 * that one screen. That is exactly how the mailer shipped.
 *
 * So the primitive is reached through `Empty` everywhere a church can see it.
 * `/design` is exempt: the gallery's whole job is to show the primitive itself,
 * and it is a tool for us rather than a screen a church opens.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SCAN = [join(ROOT, "apps", "web", "app"), join(ROOT, "apps", "web", "components")];

/** The gallery shows the primitive, and the wrapper is the primitive's caller. */
const EXEMPT = [
  join("apps", "web", "app", "design"),
  join("apps", "web", "components", "empty.tsx"),
];

function files(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out = out.concat(files(path));
    else if (path.endsWith(".tsx")) out.push(path);
  }
  return out;
}

const screens = () =>
  SCAN.flatMap(files).filter((path) => {
    const here = relative(ROOT, path);
    return !EXEMPT.some((one) => here === one || here.startsWith(`${one}/`));
  });

describe("empty screens", () => {
  it("reach the primitive through Empty, so the church's own mark is used", () => {
    const offences: string[] = [];

    for (const file of screens()) {
      const source = readFileSync(file, "utf8");
      if (/<EmptyState\b/.test(source)) offences.push(relative(ROOT, file));
    }

    expect(offences).toEqual([]);
  });

  /*
   * The other half of the same mistake. `Empty` takes a named icon and puts it
   * on the church's own tint; a screen passing a `mark` of its own has gone
   * around that, and the logo never appears.
   */
  it("never hand the wrapper a mark of their own", () => {
    const offences: string[] = [];

    for (const file of screens()) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!/<Empty\b/.test(line)) return;
        const block = lines.slice(i, i + 12).join("\n");
        const end = block.indexOf("/>");
        const inside = end === -1 ? block : block.slice(0, end);
        if (/\bmark=/.test(inside)) offences.push(`${relative(ROOT, file)}:${i + 1}`);
      });
    }

    expect(offences).toEqual([]);
  });
});
