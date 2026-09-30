import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema/index";
import { required, loadEnv } from "./env";
import type { TenantRole } from "./roles";

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
      `[hearth/db] ${host} resolves over IPv6 only. On a network without IPv6 this fails as ` +
        "ENOTFOUND. Use the Supabase connection pooler instead: " +
        "postgresql://<role>.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres",
    );
  } catch {
    // An unparseable URL is a different problem, and postgres will say so.
  }
}

const connect = (url: string) => {
  warnIfDirectHost(url);
  return postgres(url, {
    max: 8,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
    ssl: isLoopback(url) ? false : "require",
  });
};

/**
 * The owner connection. Migrations, seeding, and genuinely cross-tenant platform
 * work only. The owner is not subject to the isolation policies, which is exactly
 * why it never appears in a request path.
 */
export function owner(): postgres.Sql {
  loadEnv();
  ownerSql ??= connect(required("DATABASE_URL"));
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
  appSql ??= connect(required("APP_DATABASE_URL"));
  appDrizzle ??= drizzle(appSql, { schema });
  return appDrizzle;
}

export interface TenantContext {
  tenantId: string;
  role: TenantRole;
  userId?: string;
  ip?: string;
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
    await tx.execute(sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(sql`select set_config('app.role', ${ctx.role}, true)`);
    await tx.execute(sql`select set_config('app.user_id', ${ctx.userId ?? ""}, true)`);
    await tx.execute(sql`select set_config('app.ip', ${ctx.ip ?? ""}, true)`);
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
