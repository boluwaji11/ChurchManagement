/**
 * HRT-260. Which address goes on the envelope (R2.4).
 *
 * A household that moves, or two volunteers who each type one in, leaves two
 * address rows against one household. Both readers took whatever the database
 * handed back first and neither asked for an order, so the same family could
 * read one address on the directory and the other on its own screen, and the
 * answer could change between two loads of the same page.
 *
 * These pin the rule: the row the church flagged wins, and where nothing is
 * flagged the most recently written one does.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { createPerson, addressFor, addressesFor } from "../src/repo/members";
import { createHousehold, addToHousehold } from "../src/repo/households";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let person: string;
let household: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

/** Writes one straight in, because the point is two rows against one household. */
const put = (
  line1: string,
  options: { primary?: boolean; madeAt: string },
) => owner()`
  insert into addresses (tenant_id, household_id, line1, city, is_primary, created_at)
  values (${tenant}, ${household}, ${line1}, ${"Austin"}, ${options.primary ?? false},
          ${options.madeAt}::timestamptz)`;

const clear = () => owner()`delete from addresses where tenant_id = ${tenant}`;

beforeAll(async () => {
  tenant = await testTenant("addrpick", "Address Church");

  const made = await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Ada", lastName: "Addresser", lifecycleStatus: "member",
    } as never),
  );
  person = made.id;

  const house = await run((tx) => createHousehold(tx, as(), "The Addressers"));
  household = house.id;
  await run((tx) => addToHousehold(tx, as(), household, person, "head"));
});

afterAll(async () => {
  await dropTenants("addrpick");
  await closeConnections();
});

describe("a household with two addresses", () => {
  it("takes the one the church flagged, whichever was written first", async () => {
    await clear();
    // The newer row is the one NOT flagged, so a plain "newest wins" fails here.
    await put("1 Old Road", { primary: true, madeAt: "2024-01-01T00:00:00Z" });
    await put("2 New Lane", { madeAt: "2026-01-01T00:00:00Z" });

    const line = await run((tx) => addressFor(tx, person));
    expect(line).toContain("1 Old Road");
  });

  it("takes the most recent where the church flagged neither", async () => {
    await clear();
    await put("1 Old Road", { madeAt: "2024-01-01T00:00:00Z" });
    await put("2 New Lane", { madeAt: "2026-01-01T00:00:00Z" });

    const line = await run((tx) => addressFor(tx, person));
    expect(line).toContain("2 New Lane");
  });

  it("gives the same answer every time it is asked", async () => {
    await clear();
    await put("1 Old Road", { madeAt: "2024-01-01T00:00:00Z" });
    await put("2 New Lane", { madeAt: "2026-01-01T00:00:00Z" });
    await put("3 Third Way", { madeAt: "2025-01-01T00:00:00Z" });

    const seen = new Set<string>();
    for (let n = 0; n < 5; n += 1) {
      seen.add((await run((tx) => addressFor(tx, person))) ?? "");
    }
    expect([...seen]).toHaveLength(1);
  });

  it("the list reader agrees with the single reader", async () => {
    await clear();
    await put("1 Old Road", { primary: true, madeAt: "2026-01-01T00:00:00Z" });
    await put("2 New Lane", { madeAt: "2026-06-01T00:00:00Z" });

    const one = await run((tx) => addressFor(tx, person));
    const many = await run((tx) => addressesFor(tx, [person]));
    expect(many.get(person)).toBe(one);
  });
});

describe("a person with their own address", () => {
  it("wins over the household's", async () => {
    await clear();
    await put("1 Old Road", { primary: true, madeAt: "2026-01-01T00:00:00Z" });
    await owner()`
      insert into addresses (tenant_id, member_id, line1, city)
      values (${tenant}, ${person}, ${"9 Their Own Street"}, ${"Austin"})`;

    const line = await run((tx) => addressFor(tx, person));
    expect(line).toContain("9 Their Own Street");
  });
});
