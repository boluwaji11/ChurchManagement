/**
 * A dialog's content is portaled to the body, which breaks two things that look
 * right in the source.
 *
 * A submit button inside a DialogContent is outside its own form in the DOM, so
 * it submits nothing unless it carries form="<id>". And DialogClose wrapping a
 * submit tears the form down before React runs the action. Both shipped, and
 * both looked like the button simply did nothing.
 *
 * This walks the screens and refuses either shape.
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

describe("dialogs", () => {
  it("never wraps a submit button in DialogClose", () => {
    const offences: string[] = [];

    for (const file of SCAN.flatMap(files)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!line.includes("<DialogClose")) return;
        // Everything up to the closing tag, which is what DialogClose actually
        // wraps. A submit standing beside it as the next button is fine, and
        // reading four lines blind called that an offence.
        const rest = lines.slice(i, i + 8).join("\n");
        const end = rest.indexOf("</DialogClose>");
        const inside = end === -1 ? rest : rest.slice(0, end);
        if (inside.includes('type="submit"')) {
          offences.push(`${relative(ROOT, file)}:${i + 1}`);
        }
      });
    }

    expect(offences).toEqual([]);
  });
});
