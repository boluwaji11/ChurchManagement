import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

/**
 * Secrets live in one file at the repo root, not duplicated per app. Next only
 * reads env files from its own directory, so load the root one here. This runs
 * before compilation, which is early enough for NEXT_PUBLIC_ values to be inlined.
 */
const rootEnv = resolve(import.meta.dirname, "../../.env.local");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  /**
   * A verification build must never write into the directory a running dev
   * server is serving from. Deleting or rebuilding .next underneath `next dev`
   * leaves its manifest pointing at chunks that no longer exist, and the page
   * loads with no CSS and no JS. Scripted builds set NEXT_DIST_DIR and stay out
   * of the way.
   */
  distDir: process.env["NEXT_DIST_DIR"] || ".next",
  transpilePackages: ["@hearth/ui", "@hearth/db"],
  // postgres.js is a server driver. Keep it out of the bundle entirely.
  serverExternalPackages: ["postgres"],
  experimental: {
    // Shared element transitions where a card becomes a detail page. (R24.12)
    viewTransition: true,
  },
};

export default config;
