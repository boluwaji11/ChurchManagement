/**
 * R2.1. Every screen under /members is named in route-names.ts.
 *
 * The member record opens through an intercepting route at `@panel/(.)[id]`.
 * A dynamic segment matches any single name, so without this list a press on
 * "Mailer" hands the panel `id = "mailer"`, the panel 404s, and the screen the
 * church asked for never renders. A new directory beside the others breaks that
 * screen in exactly the same way, and the breakage is silent, so it is checked
 * here rather than found by a church.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, because a repository checked out to a path with a space in it
// arrives percent-encoded otherwise.
const here = fileURLToPath(new URL("../apps/web/app/members/", import.meta.url));

const onDisk = readdirSync(here, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  // The panel slot, the record itself, and route groups are not screen names.
  .filter((name) => !name.startsWith("@") && !name.startsWith("[") && !name.startsWith("("))
  .sort();

const source = readFileSync(join(here, "route-names.ts"), "utf8");
const listed = [...source.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]).sort();

const missing = onDisk.filter((name) => !listed.includes(name));
const extra = listed.filter((name) => !onDisk.includes(name));

if (missing.length > 0 || extra.length > 0) {
  if (missing.length > 0) {
    console.error(`Screens under /members missing from route-names.ts: ${missing.join(", ")}`);
    console.error("Without them the record panel claims the address and the screen never renders.");
  }
  if (extra.length > 0) {
    console.error(`Named in route-names.ts with no directory: ${extra.join(", ")}`);
  }
  process.exit(1);
}

console.log(`${onDisk.length} screens under /members, every one named.`);
