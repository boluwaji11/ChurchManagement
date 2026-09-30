/**
 * Regression tests for findings raised by Supabase's database linter.
 *
 * Each of these was a real weakness, not a style complaint, so each gets a test
 * rather than a fix and a promise.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, closeConnections } from "../src/client";

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

  it("grants them no function privileges either", async () => {
    const grants = await owner()<{ grantee: string; routine_name: string }[]>`
      select grantee, routine_name
      from information_schema.role_routine_grants
      where specific_schema = 'public' and grantee in ('anon', 'authenticated')`;
    expect(grants).toEqual([]);
  });
});
