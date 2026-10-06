import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

/** Secrets live in one file at the repo root. Next only reads its own. */
const rootEnv = resolve(import.meta.dirname, "../../.env.local");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  distDir: process.env["NEXT_DIST_DIR"] || ".next",
  transpilePackages: ["@connectapp/ui", "@connectapp/db"],
  // postgres.js is a server driver. Keep it out of the bundle entirely.
  serverExternalPackages: ["postgres"],
};

export default config;
