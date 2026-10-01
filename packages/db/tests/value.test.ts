/**
 * HRT-107. Time to value (R22.3).
 *
 * The target is under sixty minutes from signing up to a directory somebody can
 * use, and a target nobody measures is a sentence in a document. The thing
 * worth testing is that it is derived: an import rolled back and redone must
 * move the answer rather than leave the first attempt standing.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, closeConnections } from "../src/client";
import { timeToValue, medianMinutes, withinTarget, USABLE_PEOPLE } from "../src/repo/value";
import { testTenant, dropTenants } from "./helpers/tenant";

let quick: string;
let slow: string;

const find = (rows: Awaited<ReturnType<typeof timeToValue>>, slug: string) =>
  rows.find((row) => row.slug === slug)!;

beforeAll(async () => {
  quick = await testTenant("valuetest", "Quick Church");
  slow = await testTenant("valuetest2", "Slow Church");

  // Both signed up two hours ago, so the clock has something to measure.
  await owner()`
    update tenants set created_at = now() - interval '2 hours'
     where id in (${quick}, ${slow})`;
});

afterAll(async () => {
  await dropTenants("valuetest", "valuetest2");
  await closeConnections();
});

describe("before a church has got there (R22.3)", () => {
  it("says so rather than guessing", async () => {
    const rows = await timeToValue(owner());
    expect(find(rows, "valuetest").usableAt).toBeNull();
    expect(find(rows, "valuetest").minutes).toBeNull();
  });
});

describe("an import (R22.3)", () => {
  it("is the moment the church became usable", async () => {
    await owner()`
      insert into import_batches (tenant_id, filename, status, committed_at, created_at)
      values (${quick}, 'people.csv', 'committed', now() - interval '85 minutes', now() - interval '90 minutes')`;

    const rows = await timeToValue(owner());
    const row = find(rows, "valuetest");
    expect(row.how).toBe("import");
    // Two hours ago, committed thirty-five minutes later.
    expect(row.minutes).toBeGreaterThanOrEqual(34);
    expect(row.minutes).toBeLessThanOrEqual(36);
  });

  it("stops counting once it is rolled back", async () => {
    await owner()`
      update import_batches set rolled_back_at = now() where tenant_id = ${quick}`;
    expect(find(await timeToValue(owner()), "valuetest").usableAt).toBeNull();

    await owner()`
      update import_batches set rolled_back_at = null where tenant_id = ${quick}`;
  });
});

describe("people entered one at a time (R22.3)", () => {
  it("counts the church usable at the twenty-fifth", async () => {
    for (let i = 0; i < USABLE_PEOPLE; i += 1) {
      await owner()`
        insert into people (tenant_id, first_name, last_name, lifecycle_status, created_at)
        values (${slow}, ${`Person${i}`}, 'Slow', 'member', now() - interval '20 minutes')`;
    }

    const row = find(await timeToValue(owner()), "valuetest2");
    expect(row.how).toBe("by_hand");
    expect(row.people).toBe(USABLE_PEOPLE);
    // Signed up two hours ago, usable a hundred minutes later. Over the target,
    // which is the point of measuring it.
    expect(row.minutes).toBeGreaterThan(60);
  });

  it("is not reached by one person typed in while looking around", async () => {
    const third = await testTenant("valuetest3", "Browsing Church");
    await owner()`
      insert into people (tenant_id, first_name, last_name, lifecycle_status)
      values (${third}, 'Only', 'Person', 'member')`;

    expect(find(await timeToValue(owner()), "valuetest3").usableAt).toBeNull();
    await dropTenants("valuetest3");
  });
});

describe("the numbers the target is about (R22.3)", () => {
  it("is the middle church rather than the average", () => {
    const rows = [10, 20, 90].map((minutes) => ({ minutes })) as never[];
    expect(medianMinutes(rows)).toBe(20);
  });

  it("is the share that made it inside the hour", () => {
    const rows = [10, 20, 90, null].map((minutes) => ({ minutes })) as never[];
    expect(withinTarget(rows)).toBeCloseTo(2 / 3);
  });

  it("answers nothing when nobody has got there", () => {
    expect(medianMinutes([])).toBeNull();
    expect(withinTarget([])).toBeNull();
  });
});
