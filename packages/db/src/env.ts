import { loadEnvFiles } from "@connectapp/env/load";

/**
 * Load the environment's own secrets file from the repo root, if there is one.
 *
 * HRT-397. Which file that is depends on the environment: `.env.local` holds
 * development and `.env.production.local` holds the live credentials, read
 * only when CONNECTAPP_ENV says production. See docs/environments.md.
 *
 * Kept as a named export because the migration and seed scripts call it.
 */
export function loadEnv(): void {
  loadEnvFiles(process.cwd());
}

export function required(name: string): string {
  loadEnv();
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}
