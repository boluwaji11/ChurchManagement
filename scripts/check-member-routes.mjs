/**
 * R2.1. Every screen under /members opens in the window over the list.
 *
 * The window is an intercepting route at `@panel/(.)[id]`. A dynamic segment
 * claims any single name and beats a sibling that spells the name out, so that
 * one route answers for all of them and names each screen itself. A screen
 * added beside the others and left out of it gets looked up as a member,
 * found to be nobody, and 404s on the press. The breakage is silent, so it is
 * checked here rather than found by a church.
 *
 * `print` is the exception: it opens in its own tab, which is a fresh load
 * rather than an interception, so it needs no entry.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, because a checkout under a path with a space in it arrives
// percent-encoded otherwise.
const members = fileURLToPath(new URL("../apps/web/app/members/", import.meta.url));
const OPENS_IN_ITS_OWN_TAB = ["print"];

const screens = readdirSync(members, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => !name.startsWith("@") && !name.startsWith("[") && !name.startsWith("("))
  .filter((name) => !OPENS_IN_ITS_OWN_TAB.includes(name))
  .sort();

const route = join(members, "@panel", "(.)[id]", "page.tsx");
const source = readFileSync(route, "utf8");

const missing = screens.filter((name) => !source.includes(`id === "${name}"`));

if (missing.length > 0) {
  console.error(`Screens under /members with no answer in @panel/(.)[id]/page.tsx: ${missing.join(", ")}`);
  console.error("Each one is looked up as a member, found to be nobody, and 404s when pressed.");
  console.error(`Add: if (id === "${missing[0]}") return <...PanelPage searchParams={searchParams} />;`);
  process.exit(1);
}

console.log(`${screens.length} screens under /members, every one answered.`);
