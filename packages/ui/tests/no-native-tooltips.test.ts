/**
 * HRT-277. The `title` attribute is the operating system drawing our product.
 *
 * It arrives half a second late, in whatever grey macOS or Windows uses, where
 * the browser likes rather than where the mark is, and off the edge of the
 * window when the mark sits near one. `Tooltip` is the one this product draws,
 * and `IconButton` already carries it.
 *
 * Seven of these shipped on the inbox before anybody looked. This walks the
 * screens and refuses the attribute, which is the only way a rule nobody can
 * see holds.
 *
 * `title` on an `<iframe>` keeps its place: there it is the frame's accessible
 * name rather than a tooltip. A `title` prop passed to one of our own
 * components is a heading, so only a plain HTML tag is read as the attribute.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SCAN = [join(ROOT, "apps", "web", "app"), join(ROOT, "apps", "web", "components")];

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

/**
 * Which element an attribute sits on.
 *
 * An attribute lives inside its own tag's angle brackets, so the element is
 * the nearest `<` before it with no `>` in between. Reading the nearest tag
 * name alone called a prop on the component after a self-closing child an
 * offence.
 */
function tagBefore(source: string, at: number): string | null {
  const before = source.slice(0, at);
  const opened = before.lastIndexOf("<");
  if (opened === -1) return null;
  const inside = before.slice(opened + 1);
  if (inside.includes(">")) return null;
  return /^([A-Za-z][\w.]*)/.exec(inside)?.[1] ?? null;
}

describe("tooltips", () => {
  it("are never the one the operating system draws", () => {
    const offences: string[] = [];

    for (const file of SCAN.flatMap(files)) {
      const source = readFileSync(file, "utf8");
      for (const found of source.matchAll(/\btitle=[{"]/g)) {
        const tag = tagBefore(source, found.index);
        /* A capitalised tag is one of ours, and `title` on it is a heading. */
        if (!tag || tag[0] !== tag[0]!.toLowerCase()) continue;
        if (tag === "iframe") continue;
        const line = source.slice(0, found.index).split("\n").length;
        offences.push(`${relative(ROOT, file)}:${line} <${tag}>`);
      }
    }

    expect(offences).toEqual([]);
  });
});
