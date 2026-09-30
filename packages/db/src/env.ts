import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Load .env.local from the repo root if present. Never committed. */
let loaded = false;
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const candidate of [".env.local", "../../.env.local", "../../../.env.local"]) {
    const path = resolve(process.cwd(), candidate);
    if (existsSync(path)) {
      process.loadEnvFile(path);
      return;
    }
  }
}

export function required(name: string): string {
  loadEnv();
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}
