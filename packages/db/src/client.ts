import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema/index";
import { required, loadEnv } from "./env";
import type { TenantRole } from "./roles";
import type { Permission } from "./permissions";

export type Db = PostgresJsDatabase<typeof schema>;
/** Inside withTenant the handle is a transaction, which is all a repository needs. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

let ownerSql: postgres.Sql | undefined;
let appSql: postgres.Sql | undefined;
let appDrizzle: Db | undefined;

/**
 * TLS is required everywhere except a database on this machine.
 *
 * The exception is written as "the host is loopback" rather than as a flag,
 * because a flag is something that gets set in the wrong environment once and
 * then never noticed. A remote host cannot reach this branch, so there is no
 * configuration that turns encryption off against a real database.
 */
function isLoopback(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Supabase's direct database host, db.<ref>.supabase.co, publishes an AAAA
 * record and no A record. On a network without IPv6 it fails as ENOTFOUND, which
 * reads like a typo in the hostname and sent a whole afternoon in the wrong
 * direction once already.
 *
 * Warned rather than refused, because the direct host is correct on a network
 * that has IPv6, and on Supabase's own infrastructure. The pooler is the answer
 * everywhere else.
 */
let warnedAboutDirectHost = false;
function warnIfDirectHost(url: string): void {
  if (warnedAboutDirectHost) return;
  try {
    const host = new URL(url).hostname;
    if (!/^db\..+\.supabase\.co$/.test(host)) return;
    warnedAboutDirectHost = true;
    console.warn(
      `[connectapp/db] ${host} resolves over IPv6 only. On a network without IPv6 this fails as ` +
        "ENOTFOUND. Use the Supabase connection pooler instead: " +
        "postgresql://<role>.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres",
    );
  } catch {
    // An unparseable URL is a different problem, and postgres will say so.
  }
}

/**
 * How many connections one pool may hold.
 *
 * Port 6543 is the Supabase pooler in transaction mode: a server connection is
 * held for the length of a transaction rather than for the length of a client
 * connection, so an idle client costs the pooler nothing and the ceiling that
 * session mode on 5432 imposes (fifteen clients per role, which two pools of
 * eight could exhaust on their own) does not apply. `prepare: false` below is
 * what transaction mode requires.
 *
 * A render holds a connection for about 90ms, so ten of them serve a church
 * many times over and an eleventh caller queues rather than failing.
 */
const POOL = { app: 10, owner: 4 } as const;

const connect = (url: string, max: number) => {
  warnIfDirectHost(url);
  return postgres(url, {
    max,
    /*
     * Connections are kept rather than dropped between presses.
     *
     * Reopening one costs a TLS handshake, measured at 281ms, and ten seconds
     * is shorter than the pause between two things somebody does on a screen,
     * so every one of those pauses was being paid for. In transaction mode an
     * idle client holds nothing at the far end, so the only cost of keeping it
     * is a socket.
     */
    idle_timeout: 300,
    connect_timeout: 30,
    prepare: false,
    ssl: isLoopback(url) ? false : "require",
  });
};

/**
 * The owner connection, which the isolation policies do not constrain.
 *
 * Migrations and seeding, and the work inside this package that has no tenant
 * to be scoped by: resolving which church an address belongs to before anybody
 * has signed in, a church's own public pages, an account that belongs to no
 * church, and platform-wide work. Each of those runs before or outside a
 * tenant context, so there is nothing for RLS to apply.
 *
 * The rule that actually holds the guarantee up is narrower than "never in a
 * request path", and it is the one `tests/request-path.test.ts` enforces: the
 * web app never imports this. It calls the functions here, each of which names
 * the rows it may touch and filters to them itself, and reaches a church's own
 * data through `withTenant` so the policies apply. A screen that reached for
 * the owner directly would be one filter away from reading another church.
 */
export function owner(): postgres.Sql {
  loadEnv();
  ownerSql ??= connect(required("DATABASE_URL"), POOL.owner);
  return ownerSql;
}

/**
 * The application connection, as a role that row-level security APPLIES to.
 * Not the owner, and never the Supabase service role. See docs/architecture.md.
 *
 * Built once, because drizzle installs its date parser overrides on the client's
 * options at construction time. A per-transaction instance would both repeat that
 * work and fail, since a postgres.js transaction handle carries no options object.
 */
export function appDb(): Db {
  loadEnv();
  appSql ??= connect(required("APP_DATABASE_URL"), POOL.app);
  appDrizzle ??= drizzle(appSql, { schema });
  return appDrizzle;
}

export interface TenantContext {
  tenantId: string;
  role: TenantRole;
  userId?: string;
  ip?: string;
  /**
   * R1.6. Carried so the same object serves as both the transaction context and
   * the actor a repository checks permissions against. Postgres reads only
   * tenant_id and role: a permission is a query-layer decision, and RLS is the
   * tenant boundary underneath it.
   */
  permissions?: readonly Permission[] | null;
}

/**
 * Runs work inside a transaction with the tenant context set, which is what the
 * RLS policies read. A query that forgets its tenant filter returns nothing
 * rather than returning another church's members.
 *
 * `set_config(..., true)` is transaction-local, so a pooled connection cannot
 * leak one church's context into the next request. That third argument is the
 * whole safety property, and removing it would be a silent cross-tenant bug.
 */
export async function withTenant<T>(ctx: TenantContext, work: (tx: Tx) => Promise<T>): Promise<T> {
  return appDb().transaction(async (tx) => {
    /*
     * One statement for all four settings. The database is a continent away, so
     * a round trip costs about 20ms, and four statements spent 60ms of every
     * transaction saying things that fit in one. Measured in docs/performance.md.
     */
    await tx.execute(sql`select
      set_config('app.tenant_id', ${ctx.tenantId}, true),
      set_config('app.role', ${ctx.role}, true),
      set_config('app.user_id', ${ctx.userId ?? ""}, true),
      set_config('app.ip', ${ctx.ip ?? ""}, true)`);
    return work(tx);
  });
}

export async function closeConnections(): Promise<void> {
  await Promise.all([ownerSql?.end({ timeout: 5 }), appSql?.end({ timeout: 5 })]);
  ownerSql = undefined;
  appSql = undefined;
  appDrizzle = undefined;
}

export { schema, sql };
