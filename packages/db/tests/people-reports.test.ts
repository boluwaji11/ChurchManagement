/**
 * HRT-190, HRT-191, HRT-192. R18.7, R18.8, R18.9.
 *
 * These three read across most of the product: attendance, giving, serving,
 * groups, milestones and the background checks. The risk is a query that is
 * right about its own table and wrong about the join, so the checks here are
 * that each one runs against a real church and answers in the shape the screen
 * expects.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  servingCoverage, coverageByTeam, servingLoad, expiringChecks,
} from "../src/repo/serving-reports";
import {
  milestoneCounts, milestoneList, newMembers,
  connectedness, connectednessSummary,
} from "../src/repo/people-reports";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;

const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const today = new Date().toISOString().slice(0, 10);
const RANGE = { from: "2020-01-01", to: today };

beforeAll(async () => {
  tenant = await testTenant("peoplereport", "People Report Church");
});

afterAll(async () => {
  await dropTenants("peoplereport");
  await closeConnections();
});

describe("serving", () => {
  it("answers for a church with no rota yet", async () => {
    const found = await run((tx) => servingCoverage(tx, RANGE));
    expect(found).toEqual({
      asked: 0, filled: 0, rate: 0, waiting: 0, declined: 0, volunteers: 0,
    });
  });

  it("gives an empty list per team rather than refusing", async () => {
    expect(await run((tx) => coverageByTeam(tx, RANGE))).toEqual([]);
  });

  it("gives an empty load list", async () => {
    expect(await run((tx) => servingLoad(tx, RANGE))).toEqual([]);
  });

  /* R10.9. The join this exists for: a check, a position and a service day. */
  it("runs the expiring-check query, including the children's-position join", async () => {
    const found = await run((tx) => expiringChecks(tx, { within: 90, today }));
    expect(Array.isArray(found)).toBe(true);
  });
});

describe("milestones", () => {
  it("counts nothing for a church that has marked nothing", async () => {
    expect(await run((tx) => milestoneCounts(tx, RANGE))).toEqual([]);
    expect(await run((tx) => milestoneList(tx, RANGE))).toEqual([]);
  });

  it("narrows to one kind without the filter breaking the query", async () => {
    expect(await run((tx) => milestoneList(tx, { ...RANGE, kind: "baptism" }))).toEqual([]);
  });

  it("answers for who joined", async () => {
    expect(await run((tx) => newMembers(tx, RANGE))).toEqual([]);
  });
});

describe("the connectedness indicator", () => {
  it("answers for a church with nobody in it", async () => {
    const found = await run((tx) => connectednessSummary(tx, RANGE));
    expect(found.counted).toBe(0);
    expect(found.bands).toEqual([0, 0, 0, 0, 0]);
  });

  /* Four parts across four tables. A join that is wrong fails here rather
     than on a church's screen. */
  it("runs every one of the four parts", async () => {
    expect(await run((tx) => connectedness(tx, RANGE))).toEqual([]);
  });

  it("narrows to one band without the filter breaking the query", async () => {
    expect(await run((tx) => connectedness(tx, { ...RANGE, score: 0 }))).toEqual([]);
  });
});
