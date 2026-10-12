/**
 * R2.1. Every screen under /members has its own intercepting slot.
 *
 * The member record opens through an intercepting route at `@panel/(.)[id]`.
 * A dynamic segment matches any single name, so a screen beside it, such as
 * the mailer, is claimed by the record panel and never renders. The answer is
 * one slot entry per screen, so the panel resolves the name to the screen the
 * church asked for. A new directory added beside the others is broken the same
 * way, and the breakage is silent, so it is checked here rather than found by
 * a church.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, because a repository checked out to a path with a space in it
// arrives percent-encoded otherwise.
const here = fileURLToPath(new URL("../apps/web/app/members/", import.meta.url));
const slot = join(here, "@panel");

/**
 * The print view opens with target="_blank", which is a hard navigation to its
 * own tab, so there is no panel over the directory for it to render in.
 */
const openedInItsOwnTab = ["print"];

const screens = readdirSync(here, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  // The panel slot, the record itself, and route groups are not screen names.
  .filter((name) => !name.startsWith("@") && !name.startsWith("[") && !name.startsWith("("))
  .filter((name) => !openedInItsOwnTab.includes(name))
  .sort();

const missing = screens.filter((name) => !existsSync(join(slot, `(.)${name}`, "page.tsx")));

if (missing.length > 0) {
  console.error(
    `Screens under /members with no intercepting slot: ${missing.join(", ")}`,
  );
  console.error(
    "Add apps/web/app/members/@panel/(.)<name>/page.tsx for each, or the record panel claims the address.",
  );
  process.exit(1);
}

console.log(`${screens.length} screens under /members, every one with its own slot.`);
