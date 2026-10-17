import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { environment, assertEnvironment } from "./index";

/**
 * HRT-397. Which file of secrets a process started from a shell reads.
 *
 * Next reads a `.env.local` beside the app it is serving and this is a
 * workspace, so the secrets live once at the root and every app loads them
 * from there. That part is unchanged. What is new is that there are now two
 * files and the environment chooses between them:
 *
 *   .env.local              development. The dev Supabase project, Stripe in
 *                           a sandbox, secrets used nowhere else. This is what
 *                           `pnpm dev` reads, so the safe one is the default.
 *   .env.production.local   the live credentials, read only when the shell has
 *                           said CONNECTAPP_ENV=production.
 *
 * Production itself holds none of this: Vercel passes the variables in, no
 * file exists, and the loader finds nothing and does nothing.
 *
 * A variable already set in the shell always wins, which is how one value is
 * overridden for a single command without editing a file.
 */

let loaded = false;

/**
 * @param from  the directory to search upwards from. A caller inside an app
 *              or a package passes its own, because the root is two or three
 *              levels up depending on which it is.
 */
export function loadEnvFiles(from: string = process.cwd()): void {
  if (loaded) return;
  loaded = true;

  const name = environment() === "production" ? ".env.production.local" : ".env.local";

  for (const up of ["", "..", "../..", "../../.."]) {
    const path = resolve(from, up, name);
    if (!existsSync(path)) continue;
    process.loadEnvFile(path);
    return;
  }
}

/**
 * Load the file, then refuse to carry on if what is in it belongs somewhere
 * else. Called from each app's `next.config.ts`, which is the first of our
 * code to run in every build and every server start.
 */
export function loadAndCheck(from: string = process.cwd()): void {
  loadEnvFiles(from);
  assertEnvironment();
}
