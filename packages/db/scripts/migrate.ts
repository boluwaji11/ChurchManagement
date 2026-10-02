/**
 * Applies the generated table migrations, then the hand-written security layer.
 * Order matters: RLS policies and audit triggers loop over existing tables.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { owner, closeConnections } from "../src/client";
import { required } from "../src/env";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

async function main() {
  const sql = owner();
  await sql.unsafe("set client_min_messages = warning");
  const db = drizzle(sql);

  const migrationsFolder = join(root, "migrations");
  const files = readdirSync(migrationsFolder).filter((f) => f.endsWith(".sql"));
  console.log(`Applying ${files.length} table migration(s) from migrations/`);
  await migrate(db, { migrationsFolder });

  console.log("Applying sql/search.sql (trigram indexes behind the search box)");
  await sql.unsafe(readFileSync(join(root, "sql", "search.sql"), "utf8"));

  console.log("Applying sql/security.sql (roles, RLS, grants, audit triggers)");
  const security = readFileSync(join(root, "sql", "security.sql"), "utf8");

  // The app role's password is passed as a session setting rather than
  // interpolated into the file, so it never appears in a committed artefact.
  await sql.unsafe(`set hearth.app_password = '${required("HEARTH_APP_PASSWORD").replace(/'/g, "''")}'`);
  await sql.unsafe(security);

  const policyRows = await sql<{ count: string }[]>`
    select count(*)::text as count from pg_policies where schemaname = 'public'`;
  const tableRows = await sql<{ count: string }[]>`
    select count(*)::text as count from pg_tables
    where schemaname = 'public' and rowsecurity = true`;
  const triggerRows = await sql<{ count: string }[]>`
    select count(*)::text as count from pg_trigger
    where not tgisinternal and tgname like 'audit_%'`;

  const policies = policyRows[0]?.count ?? "0";
  const tables = tableRows[0]?.count ?? "0";
  const triggers = triggerRows[0]?.count ?? "0";

  console.log(`\nDone. ${tables} tables with RLS enabled, ${policies} policies, ${triggers} audit triggers.`);
  await closeConnections();
}

main().catch(async (err) => {
  console.error(err);
  await closeConnections();
  process.exit(1);
});
