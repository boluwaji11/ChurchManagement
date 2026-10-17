import type { NextConfig } from "next";
import { loadAndCheck } from "@connectapp/env/load";

/**
 * Secrets live in one file at the repo root. Next only reads its own, so the
 * root one is loaded here, and HRT-397 checks what is in it against the
 * environment this process says it is. See docs/environments.md.
 */
loadAndCheck(import.meta.dirname);

const config: NextConfig = {
  distDir: process.env["NEXT_DIST_DIR"] || ".next",
  transpilePackages: ["@connectapp/ui", "@connectapp/db", "@connectapp/env"],
  // postgres.js is a server driver. Keep it out of the bundle entirely.
  serverExternalPackages: ["postgres"],
};

export default config;
