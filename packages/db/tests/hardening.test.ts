/**
 * Regression tests for findings raised by Supabase's database linter.
 *
 * Each of these was a real weakness, not a style complaint, so each gets a test
 * rather than a fix and a promise.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { owner, withTenant, closeConnections } from "../src/client";
import { withAuditTriggersOff, deleteTenantsLike } from "../src/maintenance";
import { testTenant } from "./helpers/tenant";

const OUR_FUNCTIONS = ["app_tenant_id", "app_role", "app_user_id", "audit_write"] as const;

let functions: { name: string; config: string[] | null; definer: boolean }[];

beforeAll(async () => {
  functions = await owner()<{ name: string; config: string[] | null; definer: boolean }[]>`
    select p.proname as name, p.proconfig as config, p.prosecdef as definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(${OUR_FUNCTIONS as unknown as string[]})`;
});

afterAll(async () => {
  await closeConnections();
});

describe("function search_path is pinned", () => {
  it("covers every function we define in public", () => {
    expect(functions.map((f) => f.name).sort()).toEqual([...OUR_FUNCTIONS].sort());
  });

  it("pins search_path on all of them", () => {
    // A mutable search_path lets anyone who can create an object in an earlier
    // schema shadow what the function resolves. That is escalation, not style.
    const unpinned = functions.filter((f) => !(f.config ?? []).some((c) => c.startsWith("search_path=")));
    expect(unpinned.map((f) => f.name)).toEqual([]);
  });
});

describe("no SECURITY DEFINER surface", () => {
  it("defines none of our functions as definer", () => {
    // audit_write does not need it: hearth_app holds INSERT on audit_entries and
    // the isolation policy passes, because the row's tenant is the tenant in
    // context. Removing the escalation surface beats guarding it.
    expect(functions.filter((f) => f.definer).map((f) => f.name)).toEqual([]);
  });

  it("does not let anon or authenticated execute the audit trigger function", async () => {
    for (const role of ["anon", "authenticated", "public"]) {
      const rows = await owner()<{ ok: boolean | null }[]>`
        select has_function_privilege(${role}, 'public.audit_write()', 'execute') as ok`;
      expect(rows[0]?.ok, `${role} can execute audit_write`).toBe(false);
    }
  });

  it("still lets the application role call the policy helpers", async () => {
    for (const fn of ["app_tenant_id()", "app_role()", "app_user_id()"]) {
      const rows = await owner()<{ ok: boolean | null }[]>`
        select has_function_privilege('hearth_app', ${`public.${fn}`}, 'execute') as ok`;
      expect(rows[0]?.ok, `hearth_app cannot call ${fn}`).toBe(true);
    }
  });
});

describe("nothing is reachable over the auto-generated REST API", () => {
  it("grants anon and authenticated no privilege on any table", async () => {
    const grants = await owner()<{ grantee: string; table_name: string; privilege_type: string }[]>`
      select grantee, table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')`;
    expect(grants).toEqual([]);
  });

  it("grants them no function privileges in the exposed schema", async () => {
    const grants = await owner()<{ grantee: string; routine_name: string }[]>`
      select grantee, routine_name
      from information_schema.role_routine_grants
      where specific_schema = 'public' and grantee in ('anon', 'authenticated')`;

    expect(grants).toEqual([]);
  });

  /**
   * The one function `authenticated` may call lives where PostgREST cannot
   * serve it.
   *
   * The storage bucket policies are evaluated as that role, so the membership
   * check they call has to be executable by it. PostgREST publishes every
   * function in the exposed schema as an RPC endpoint, so the function sits in
   * `hearth`, which is not exposed. It answers one question about the caller's
   * own account: am I in this church.
   */
  it("keeps the storage membership check out of the exposed schema", async () => {
    const [fn] = await owner()<{ definer: boolean }[]>`
      select p.prosecdef as definer
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'hearth' and p.proname = 'user_in_church'`;
    expect(fn?.definer, "hearth.user_in_church is missing").toBe(true);

    const [gone] = await owner()<{ present: boolean }[]>`
      select exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'user_in_church'
      ) as present`;
    expect(gone?.present, "public.user_in_church is still an RPC endpoint").toBe(false);

    const [may] = await owner()<{ ok: boolean | null }[]>`
      select has_function_privilege('authenticated', 'hearth.user_in_church(text)', 'execute') as ok`;
    expect(may?.ok, "the bucket policies cannot call it").toBe(true);
  });
});

/**
 * R1.11 says the audit log covers every write. That was once a hardcoded list of
 * table names in security.sql, which held until the day a table was added and
 * nobody noticed it was writing nothing. An unaudited table looks exactly like an
 * audited one right up to the moment somebody asks who changed a record.
 *
 * So the coverage is asserted rather than trusted, by looking at what the
 * database actually has.
 */
describe("the audit log covers every table that holds church data", () => {
  it("has an audit trigger on every table with a tenant_id, and none on the log itself", async () => {
    const rows = await owner()<{ relname: string; triggers: number }[]>`
      select c.relname, count(t.tgname) filter (where t.tgname like 'audit_%')::int as triggers
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and a.attnum > 0
        left join pg_trigger t on t.tgrelid = c.oid
       group by c.relname, n.nspname, c.relkind
      having n.nspname = 'public' and c.relkind = 'r'
       order by c.relname`;

    const unaudited = rows.filter((r) => r.relname !== "audit_entries" && r.triggers === 0);
    expect(unaudited.map((r) => r.relname), "tables with no audit trigger").toEqual([]);

    // Auditing the audit log would recurse on every write.
    const log = rows.find((r) => r.relname === "audit_entries");
    expect(log?.triggers).toBe(0);
  });
});

describe("the request path cannot switch its own auditing off", () => {
  it("writes the audit row anyway when hearth_app sets the flag", async () => {
    const id = await testTenant("auditoff", "Audit Off Church");

    // Exactly what a compromised query layer would try: the setting that the
    // maintenance path uses, set from the role every request runs as.
    await withTenant({ tenantId: id, role: "owner" }, async (tx) => {
      await tx.execute(sql`select set_config('app.audit_off', '1', true)`);
      await tx.execute(sql`
        insert into tags (tenant_id, name, hue) values (${id}, 'Audited anyway', 'sky')`);
    });

    const [row] = await owner()<{ n: string }[]>`
      select count(*)::text as n from audit_entries
       where tenant_id = ${id} and entity = 'tags'`;
    expect(Number(row!.n)).toBe(1);

    await deleteTenantsLike("auditoff");
  });

  it("is honoured for the owner connection, which is the one that resets things", async () => {
    const id = await testTenant("auditoff2", "Audit Off Church 2");

    await withAuditTriggersOff(async (sql) => {
      await sql`insert into tags (tenant_id, name, hue) values (${id}, 'Quiet', 'sky')`;
    });

    const [row] = await owner()<{ n: string }[]>`
      select count(*)::text as n from audit_entries where tenant_id = ${id}`;
    expect(Number(row!.n)).toBe(0);

    await deleteTenantsLike("auditoff2");
  });
});
