import { owner } from "../src/client";

/**
 * Whether this database is a Supabase project rather than a bare Postgres.
 *
 * `auth.users` is Supabase's own table. CI runs the isolation suite against a
 * plain Postgres container, which has no such thing, so anything that writes an
 * account cannot run there. Those tests skip rather than fail: a skip says "not
 * checked here", and a failure would say "this is broken", and only one of
 * those is true. They run on every developer machine, where .env.local points
 * at the project.
 *
 * Read at module load rather than in a hook, so the skip happens at collection
 * and is reported as a skip rather than as a silent pass.
 */
export const HAS_ACCOUNTS = (
  await owner()<{ present: boolean }[]>`
    select to_regclass('auth.users') is not null as present`
)[0]?.present ?? false;
