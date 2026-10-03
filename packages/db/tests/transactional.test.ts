/**
 * HRT-138. The shared transactional allowance (R16.3).
 *
 * Hearth pays for a small amount of mail so a church can be invited, reset a
 * password and answer a schedule request on its first day. The tests are about
 * the counting: what charges the allowance, what does not, and that the number
 * is one a church can see rather than a quiet throttle.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  sharedAllowance, recordSend, recentSends, SHARED_MONTHLY_ALLOWANCE,
} from "../src/repo/transactional";
import { InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "transactionaltest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const send = (over: Partial<Parameters<typeof recordSend>[2]> = {}) =>
  run((tx) =>
    recordSend(tx, as(), {
      purpose: "invitation",
      toEmail: "Somebody@Example.org",
      via: "shared",
      status: "sent",
      ...over,
    } as Parameters<typeof recordSend>[2]),
  );

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Transactional Test Church");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("the shared allowance", () => {
  it("starts the month whole", async () => {
    const allowance = await run((tx) => sharedAllowance(tx));
    expect(allowance).toMatchObject({
      used: 0,
      allowance: SHARED_MONTHLY_ALLOWANCE,
      remaining: SHARED_MONTHLY_ALLOWANCE,
    });
    expect(allowance.resetsOn).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("charges a message that went out on the shared account", async () => {
    await send();
    expect((await run((tx) => sharedAllowance(tx))).used).toBe(1);
  });

  it("leaves the allowance alone for a church sending on its own account", async () => {
    await send({ via: "church" });
    await send({ via: "church" });
    expect((await run((tx) => sharedAllowance(tx))).used).toBe(1);
  });

  it("does not charge for a message the mail server refused", async () => {
    await send({ status: "failed", reason: "Mailbox unavailable" });
    await send({ status: "refused", reason: "The allowance is used up." });
    expect((await run((tx) => sharedAllowance(tx))).used).toBe(1);
  });

  it("lowercases the address, so the ledger reads as one person", async () => {
    const [latest] = await run((tx) => recentSends(tx, 1));
    expect(latest!.toEmail).toBe("somebody@example.org");
  });

  it("counts against the month being asked about", async () => {
    const nextYear = await run((tx) =>
      sharedAllowance(tx, new Date(Date.UTC(2099, 5, 15))),
    );
    expect(nextYear.used).toBe(0);
    expect(nextYear.resetsOn).toBe("2099-07-01");
  });

  it("rolls the reset date over the end of a year", async () => {
    const december = await run((tx) =>
      sharedAllowance(tx, new Date(Date.UTC(2099, 11, 2))),
    );
    expect(december.resetsOn).toBe("2100-01-01");
  });

  it("refuses something the allowance does not cover, and a blank recipient", async () => {
    await expect(
      send({ purpose: "newsletter" as never }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(send({ toEmail: "  " })).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("reads the ledger newest first, with what the server said", async () => {
    const sends = await run((tx) => recentSends(tx));
    expect(sends.length).toBeGreaterThan(3);

    const times = sends.map((s) => Date.parse(s.sentAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(sends.some((s) => s.reason === "Mailbox unavailable")).toBe(true);
  });
});
