/**
 * The guard on R22.8.
 *
 * A catalogue is only worth having if everything is in it, and "everything" is
 * a state that decays one hurried commit at a time. This walks the product's
 * screens and fails on a user-facing string that was written inline.
 *
 * It is a heuristic, not a parser. It looks at the places copy actually goes:
 * the props that render text, and JSX text nodes. That catches the mistake
 * people make without flagging every string in the codebase, which is the
 * failure mode that gets a check like this deleted.
 *
 * The /design gallery is excluded. It is an internal tool for the people
 * building this, not a screen a church sees.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const SCAN = [join(ROOT, "apps/web/app"), join(ROOT, "apps/web/components")];
const SKIP = [
  "/design",
  // Only rendered inside the design gallery, which is an internal tool.
  "gallery-controls",
  "/api/",
  "node_modules",
  ".next",
];

/** Props whose value is shown to a person. */
const COPY_PROPS = [
  "title", "label", "lede", "body", "note", "placeholder", "description",
  "aria-label", "closeLabel", "hint", "legend",
];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP.some((s) => full.includes(s))) continue;
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

interface Offence {
  file: string;
  line: number;
  text: string;
}

const PROP_LITERAL = new RegExp(`\\b(${COPY_PROPS.join("|")})=\\{?"([^"]{2,})"`, "g");
/**
 * A JSX text node: between > and <, on its own, with a letter in it.
 *
 * The lookbehind keeps arrow functions and comparisons out. Without it,
 * `=> Promise<...>` reads as the text "Promise" sitting between two tags.
 */
const JSX_TEXT = /(?<![=\-!<>])>([^<>{}\n]*[A-Za-z]{2}[^<>{}\n]*)</g;

/** Words that are code, not copy. */
const NOT_COPY = /^(true|false|null|undefined|button|submit|email|tel|date|number|text|off|on|one|other|popper|vertical|horizontal|neutral|primary|secondary|accent|ghost|danger|warning|success|info|critical|quiet|sm|md|lg|xl)$/i;

function scan(file: string): Offence[] {
  const found: Offence[] = [];
  const lines = readFileSync(file, "utf8").split("\n");

  lines.forEach((line, i) => {
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;

    for (const m of line.matchAll(PROP_LITERAL)) {
      const value = m[2]!;
      if (NOT_COPY.test(value) || !/[A-Za-z]{2}/.test(value)) continue;
      // A single lowercase token is almost always a value, not a sentence.
      if (!/\s/.test(value) && value === value.toLowerCase()) continue;
      found.push({ file, line: i + 1, text: `${m[1]}="${value}"` });
    }

    for (const m of line.matchAll(JSX_TEXT)) {
      const value = m[1]!.trim();
      if (!value || NOT_COPY.test(value)) continue;
      if (!/[A-Za-z]{2}/.test(value)) continue;
      // Copy is words. A colon, a bracket or a leading comma means this is the
      // tail of a type annotation that happens to sit between two angle
      // brackets, such as `Promise<T>, extra: Record<...>`.
      if (/[:(),=[\]]/.test(value)) continue;
      found.push({ file, line: i + 1, text: value });
    }
  });

  return found;
}

describe("every user-facing string is in the catalogue (R22.8)", () => {
  it("finds no copy written inline in a screen", () => {
    const offences = SCAN.flatMap(files).flatMap(scan);
    const report = offences.map((o) => `${relative(ROOT, o.file)}:${o.line}  ${o.text}`);
    expect(report).toEqual([]);
  });

  it("is actually looking at something", () => {
    // A scanner that silently finds no files passes forever.
    expect(SCAN.flatMap(files).length).toBeGreaterThan(10);
  });
});
