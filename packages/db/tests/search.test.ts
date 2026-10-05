/**
 * HRT-119. One search box, over everything a church remembers (R2.14).
 *
 * The acceptance criterion is a number: results in under 300ms at five thousand
 * members. So this builds a church of five thousand and times it, rather than
 * asserting that a query exists.
 *
 * Every clause in the search is a substring match with a leading wildcard, which
 * no btree index can answer. The trigram indexes in sql/search.sql are the whole
 * reason the number holds, and this file is what notices if they are dropped.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql, type SQL } from "drizzle-orm";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { listPeople, countPeople, directoryWhere } from "../src/repo/members";
import { members } from "../src/schema/members";
import { withAuditTriggersOff } from "../src/maintenance";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "searchtest";
const SIZE = 5000;
/** R2.14's number. */
const BUDGET_MS = 300;

const run = <T>(work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId: tenant, role: "owner" }, work);

/**
 * How long the search takes the database, in milliseconds.
 *
 * R2.14's 300ms is a budget for the query. These tests run against a Supabase
 * instance in another region, where one round trip is a few hundred
 * milliseconds and a transaction is several, so wall-clock time here would
 * measure the distance to the datacentre rather than anything about the
 * product. So the database is asked what it spent.
 *
 * The predicate comes from `directoryWhere`, the same function the directory
 * screen and the export both use. A copy of it here would drift, and then this
 * file would be reporting a number about a query nobody runs.
 */
async function queryMs(opts: Parameters<typeof directoryWhere>[0]): Promise<number> {
  const where = directoryWhere(opts).filter(Boolean) as SQL[];
  return run(async (tx) => {
    const rows = (await tx.execute(sql`
      explain (analyze, summary)
      select ${members.id} from ${members}
      where ${sql.join(where, sql` and `)}
      limit 50`)) as unknown as Record<string, string>[];

    const text = rows.map((r) => Object.values(r)[0]).join("\n");
    const found = /Execution Time: ([\d.]+) ms/.exec(text);
    if (!found) throw new Error(`No execution time in:\n${text}`);
    return Number(found[1]);
  });
}

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Search Test Church");

  // Five thousand members, their households, an email, a phone and an address.
  // Written in one statement per table with the audit triggers off, because the
  // point of the file is the read and nobody needs 20,000 audit rows.
  await withAuditTriggersOff(async (sql) => {
    await sql`
      insert into households (tenant_id, name)
      select ${tenant}, 'House ' || g from generate_series(1, ${SIZE / 4}) g`;

    await sql`
      insert into members (tenant_id, first_name, last_name, lifecycle_status)
      select ${tenant},
             (array['Sarah','Michael','Grace','Daniel','Ruth','Tobias','Amara','Noah'])[1 + (g % 8)],
             'Surname' || g,
             'member'
        from generate_series(1, ${SIZE}) g`;

    await sql`
      insert into household_memberships (tenant_id, household_id, member_id, role)
      select ${tenant}, h.id, p.id, 'other'
        from (select id, row_number() over (order by name) rn from households where tenant_id = ${tenant}) h
        join (select id, row_number() over (order by last_name) rn from members where tenant_id = ${tenant}) p
          on ((p.rn - 1) / 4) + 1 = h.rn`;

    await sql`
      insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
      select ${tenant}, p.id, 'email', 'home', 'person' || p.rn || '@searchtest.invalid', true
        from (select id, row_number() over (order by last_name) rn from members where tenant_id = ${tenant}) p`;

    await sql`
      insert into contact_methods (tenant_id, member_id, kind, label, value, is_primary)
      select ${tenant}, p.id, 'phone', 'mobile',
             '(512) 555-' || lpad((p.rn % 10000)::text, 4, '0'), true
        from (select id, row_number() over (order by last_name) rn from members where tenant_id = ${tenant}) p`;

    await sql`
      insert into addresses (tenant_id, household_id, line1, city, postal_code)
      select ${tenant}, h.id, h.rn || ' Juniper Street', 'Austin', '7870' || (h.rn % 10)
        from (select id, row_number() over (order by name) rn from households where tenant_id = ${tenant}) h`;
  });

  // The planner will not reach for a trigram index on statistics it has not
  // gathered, and a cold table makes this file measure the wrong thing.
  await owner().unsafe("analyze members");
  await owner().unsafe("analyze contact_methods");
  await owner().unsafe("analyze addresses");
  await owner().unsafe("analyze household_memberships");
}, 180_000);

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("a church of five thousand", () => {
  it("has five thousand members in it", async () => {
    expect(await run((tx) => countPeople(tx, {}))).toBe(SIZE);
  });

  it("finds somebody by part of a surname inside the budget", async () => {
    expect(await run((tx) => listPeople(tx, { q: "urname4242" }))).not.toHaveLength(0);
    const ms = await queryMs({ q: "urname4242" });
    expect(ms, `took ${ms}ms`).toBeLessThan(BUDGET_MS);
  });

  it("finds somebody by first name and surname typed together", async () => {
    expect(await run((tx) => listPeople(tx, { q: "grace surname42" }))).not.toHaveLength(0);
    const ms = await queryMs({ q: "grace surname42" });
    expect(ms, `took ${ms}ms`).toBeLessThan(BUDGET_MS);
  });

  it("finds somebody by email inside the budget", async () => {
    expect(await run((tx) => listPeople(tx, { q: "person4242@" }))).toHaveLength(1);
    const ms = await queryMs({ q: "person4242@" });
    expect(ms, `took ${ms}ms`).toBeLessThan(BUDGET_MS);
  });

  it("finds somebody by the digits of a phone number, however it was written", async () => {
    // The church holds "(512) 555-0148". Somebody types the digits.
    expect(await run((tx) => listPeople(tx, { q: "5550148" }))).not.toHaveLength(0);
    const ms = await queryMs({ q: "5550148" });
    expect(ms, `took ${ms}ms`).toBeLessThan(BUDGET_MS);
  });

  it("finds somebody by their household's street (R2.14)", async () => {
    expect(await run((tx) => listPeople(tx, { q: "242 Juniper" }))).not.toHaveLength(0);
    const ms = await queryMs({ q: "242 Juniper" });
    expect(ms, `took ${ms}ms`).toBeLessThan(BUDGET_MS);
  });

  it("finds somebody by postcode", async () => {
    expect(await run((tx) => listPeople(tx, { q: "78703" }))).not.toHaveLength(0);
  });

  it("counts the matches as well, because the screen shows the number", async () => {
    expect(await run((tx) => countPeople(tx, { q: "juniper" }))).toBe(SIZE);
    const ms = await queryMs({ q: "juniper" });
    expect(ms, `took ${ms}ms`).toBeLessThan(BUDGET_MS);
  });

  it("answers nothing for something nobody has, just as quickly", async () => {
    expect(await run((tx) => listPeople(tx, { q: "zzzznothing" }))).toHaveLength(0);
    const ms = await queryMs({ q: "zzzznothing" });
    expect(ms, `took ${ms}ms`).toBeLessThan(BUDGET_MS);
  });
});
