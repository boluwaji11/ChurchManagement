import { owner } from "./client";

/**
 * Operations that only the seed script and the test suite perform.
 *
 * Nothing here is reachable from the web app. It runs on the owner connection
 * and it removes data, which is exactly the combination that has no business in
 * a request path.
 */

/**
 * Runs work with the audit triggers off, then puts them back.
 *
 * Deleting a church cascades to its people, the trigger records each of those
 * deletions, and the new audit row points at the church being deleted in the
 * same statement. Postgres refuses it, correctly.
 *
 * Turning the triggers off is the honest answer rather than a workaround. A
 * reset is not something a person did, so there is nobody to attribute it to.
 * The triggers go back on in a finally, so a failure halfway leaves the database
 * auditing again.
 */
export async function withAuditTriggersOff<T>(work: () => Promise<T>): Promise<T> {
  const sql = owner();

  const tables = (
    await sql<{ relname: string }[]>`
      select c.relname
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and t.tgname like 'audit_%'`
  ).map((r) => r.relname);

  const set = async (state: "disable" | "enable") => {
    for (const table of tables) {
      await sql.unsafe(`alter table public.${table} ${state} trigger audit_${table}`);
    }
  };

  await set("disable");
  try {
    return await work();
  } finally {
    await set("enable");
  }
}

/** Removes churches by slug, and everything that cascades from them. */
export async function deleteTenants(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  await withAuditTriggersOff(async () => {
    await owner()`delete from tenants where slug in ${owner()(slugs)}`;
  });
}

/** Removes churches whose slug starts with a prefix. For test cleanup. */
export async function deleteTenantsLike(prefix: string): Promise<void> {
  await withAuditTriggersOff(async () => {
    await owner()`delete from tenants where slug like ${prefix + "%"}`;
  });
}
