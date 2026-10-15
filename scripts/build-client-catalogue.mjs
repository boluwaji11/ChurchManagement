/**
 * R20.1, R24.11. The words the browser is given, worked out from the screens.
 *
 * A client component that imports `t` pulls in whatever `t` imports, so the
 * whole catalogue, 4,729 keys and 67KB over the wire, went to every browser for
 * the sake of the words one component asked for. Most of it is never read on a
 * screen at all: the emails, the giving statements, the printed sheets, the
 * importer's refusals, the words a job queue puts in a notification.
 *
 * So this reads the files marked "use client" and writes down what they name:
 *
 *   t("members.title")            one key, taken as it is
 *   plural("directory.found", n)  one stem, with its own plural forms
 *   t(`giving.method.${one}`)     a key built at runtime, so its whole group
 *                                 goes, because no tool can know which one
 *
 * A group is the first part of a key, up to the first dot. Taking the whole of
 * a group is the conservative answer, and it is what makes the result safe to
 * ship: anything a screen can ask for at runtime is already there.
 *
 * Run `pnpm catalogue` after changing a screen's words. The result is committed
 * and CI fails if it is stale, the same way it does for the design tokens.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SCREENS = join(root, "apps/web");
const CATALOGUE = join(root, "packages/i18n/src/messages/en.ts");
const OUT = join(root, "packages/i18n/src/messages/client.ts");

/** Every file under a directory, skipping what is not ours. */
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".next")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (path.endsWith(".ts") || path.endsWith(".tsx")) yield path;
  }
}

/** The keys in the catalogue, in the order it writes them. */
function catalogueKeys() {
  const source = readFileSync(CATALOGUE, "utf8");
  return [...source.matchAll(/^ {2}"([^"]+)":/gm)].map((m) => m[1]);
}

/**
 * Where an import leads, as a file on disk.
 *
 * Only what this repository wrote: a relative path or the app's own `@/`. A
 * package is somebody else's bundle and names no catalogue keys of ours.
 */
function fileFor(from, specifier) {
  const base = specifier.startsWith("@/")
    ? join(SCREENS, specifier.slice(2))
    : specifier.startsWith(".")
      ? join(from, "..", specifier)
      : null;
  if (!base) return null;

  for (const ending of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const path = `${base}${ending}`;
    try {
      if (statSync(path).isFile()) return path;
    } catch {
      // Not that one.
    }
  }
  return null;
}

/**
 * What the browser's own files name, as keys taken outright and groups taken
 * whole.
 *
 * It starts at the files marked "use client" and follows their imports, because
 * what reaches the browser is the whole graph under them rather than the entry
 * alone. The lifecycle words are the case that proves it: a client form reads
 * them through `lib/person-input.ts`, which carries no directive of its own,
 * and a scan of directives alone left every status on the directory drawing its
 * key.
 *
 * A file marked "use server" is not followed. Its body stays on the server and
 * the browser is handed a stub that calls it.
 */
function whatTheScreensName() {
  const read = new Set();
  const named = new Set();
  const groups = new Set();
  const unbounded = [];

  const queue = [];
  const seen = new Set();

  for (const path of walk(SCREENS)) {
    const head = readFileSync(path, "utf8").slice(0, 400);
    if (/^\s*["']use client["']/m.test(head)) queue.push(path);
  }

  while (queue.length > 0) {
    const path = queue.pop();
    if (seen.has(path)) continue;
    seen.add(path);

    const source = readFileSync(path, "utf8");
    if (/^\s*["']use server["']/m.test(source.slice(0, 400))) continue;

    /*
     * Any key this file writes down, rather than only the ones it reads
     * through `t`. A screen can hold a key as data and resolve it later: the
     * team library is a table of `label: "teamLib.worship"` read with
     * `t(one.label)`, and a scan of `t("...")` alone left every name in that
     * picker drawing its key. A string that is not a key in the catalogue is
     * ignored below, so this nets nothing it should not.
     */
    for (const [, key] of source.matchAll(/["']([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_]+)+)["']/g)) {
      named.add(key);
    }

    for (const [, stem] of source.matchAll(/\b(?:t|plural)\(\s*`([^`$]*)\$\{/g)) {
      if (stem) groups.add(stem.split(".")[0]);
      /* A key with nothing in front of it is a key this cannot bound. The
         component is asked to take the words instead, and until it does the
         build fails rather than shipping a screen that may show a key. */
      else unbounded.push(relative(root, path));
    }

    for (const [, specifier] of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const next = fileFor(path, specifier);
      if (next && !seen.has(next)) queue.push(next);
    }
  }

  return { read, named, groups, unbounded, reached: seen.size };
}

const keys = catalogueKeys();
const { read, named, groups, unbounded, reached } = whatTheScreensName();

if (unbounded.length > 0) {
  console.error("A client file builds a catalogue key out of a variable alone:");
  for (const path of [...new Set(unbounded)]) console.error(`  ${path}`);
  console.error("Nothing can tell which words that screen needs, so the browser");
  console.error("would have to carry all of them. Pass the words in instead.");
  process.exit(1);
}

/** A plural stem names forms the screen never writes out. */
const PLURALS = ["zero", "one", "two", "few", "many", "other"];

const wanted = new Set();
for (const key of keys) {
  const group = key.split(".")[0];
  if (groups.has(group)) wanted.add(key);
  else if (named.has(key)) wanted.add(key);
  else if (PLURALS.some((form) => named.has(key.slice(0, -(form.length + 1))) && key.endsWith(`.${form}`))) {
    wanted.add(key);
  }
}

/* A key a screen reads through `t` and the catalogue does not hold is a blank
   on a screen, so it fails here. A key-shaped string that is not a key, a
   permission name or a file name, is simply not a key and is left alone. */
const missing = [...read].filter((key) => !keys.includes(key) && !PLURALS.some(
  (form) => keys.includes(`${key}.${form}`),
));
if (missing.length > 0) {
  console.error(`Keys read by a screen that the catalogue does not hold: ${missing.join(", ")}`);
  process.exit(1);
}

const source = readFileSync(CATALOGUE, "utf8");
const lines = [...source.matchAll(/^ {2}"([^"]+)": ((?:[^\n]|\n(?! {2}"))*?),\n/gm)];
const held = new Map(lines.map((m) => [m[1], m[2]]));

const body = [...wanted]
  .map((key) => `  ${JSON.stringify(key)}: ${held.get(key)},`)
  .join("\n");

writeFileSync(OUT, `/**
 * R20.1, R24.11. The words the browser is given. Generated, do not edit.
 *
 * Written by \`scripts/build-client-catalogue.mjs\` from the keys the screens
 * marked "use client" actually name. Run \`pnpm catalogue\` after changing a
 * screen's words; CI fails if this file is stale.
 *
 * ${wanted.size} of ${keys.length} keys.
 */
import type { Catalogue } from "../core";

export const browserWords: Catalogue = {
${body}
};
`);

console.log(`${wanted.size} of ${keys.length} keys go to the browser, from ${reached} files.`);
