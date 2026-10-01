/**
 * HRT-26. Background check status and expiry (R2.10, R21.11).
 *
 * Two things are worth protecting here. The record is append only, because "we
 * checked her in 2024" has to stay answerable in 2030. And the standing is one
 * rule, shared with the serving gate that lands in 0.4, rather than a date
 * comparison written twice.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  checksFor, recordCheck, checkStandings, clearedForChildren, canSeeChecks,
} from "../src/repo/checks";
import { standing, mayServeWithChildren, EXPIRY_WARNING_DAYS } from "../src/repo/check-rules";
import { createPerson } from "../src/repo/people";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let ruth: string;
let sam: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const TODAY = "2026-10-01";

beforeAll(async () => {
  tenant = await testTenant("checktest", "Check Test Church");
  const make = async (firstName: string) =>
    (await run((tx) =>
      createPerson(tx, as(), {
        firstName, lastName: "Checked", lifecycleStatus: "member",
      } as never),
    )).id;
  ruth = await make("Ruth");
  sam = await make("Sam");
});

afterAll(async () => {
  await dropTenants("checktest");
  await closeConnections();
});

describe("the rule, with nothing behind it (R2.10)", () => {
  it("knows nobody has checked them", () => {
    expect(standing([], TODAY)).toBe("none");
  });

  it("knows a check that has run out from one that never had an end", () => {
    expect(standing([{ status: "clear", completedOn: "2023-01-01", expiresOn: "2026-01-01" }], TODAY))
      .toBe("expired");
    expect(standing([{ status: "clear", completedOn: "2023-01-01", expiresOn: null }], TODAY))
      .toBe("clear");
  });

  it("warns before it runs out rather than after", () => {
    const soon = { status: "clear", completedOn: "2024-01-01", expiresOn: "2026-11-01" };
    expect(standing([soon], TODAY)).toBe("expiring");
    // And the volunteer keeps serving through the warning, which is the point.
    expect(mayServeWithChildren([soon], TODAY)).toBe(true);
    expect(EXPIRY_WARNING_DAYS).toBe(60);
  });

  it("lets the latest check decide", () => {
    const checks = [
      { status: "clear", completedOn: "2022-01-01", expiresOn: "2025-01-01" },
      { status: "clear", completedOn: "2026-01-01", expiresOn: "2029-01-01" },
    ];
    expect(standing(checks, TODAY)).toBe("clear");
  });

  it("keeps a flagged check standing until a later one supersedes it", () => {
    const flagged = [{ status: "flagged", completedOn: "2020-01-01", expiresOn: "2023-01-01" }];
    expect(standing(flagged, TODAY)).toBe("flagged");
    expect(mayServeWithChildren(flagged, TODAY)).toBe(false);
  });

  it("refuses a pending one, because pending is not cleared", () => {
    const pending = [{ status: "pending", completedOn: null, expiresOn: null }];
    expect(standing(pending, TODAY)).toBe("pending");
    expect(mayServeWithChildren(pending, TODAY)).toBe(false);
  });
});

describe("recording one (R2.10)", () => {
  it("keeps who did it, when, what it said, and when it runs out", async () => {
    const check = await run((tx) =>
      recordCheck(tx, as(), {
        personId: ruth, provider: "Checkr", status: "clear",
        completedOn: "2026-02-01", expiresOn: "2029-02-01",
      }),
    );
    expect(check.provider).toBe("Checkr");
    expect(check.completedOn).toBe("2026-02-01");

    const view = await run((tx) => checksFor(tx, as(), ruth));
    expect(view.standing).toBe("clear");
    expect(view.expiresOn).toBe("2029-02-01");
  });

  it("supersedes rather than overwrites", async () => {
    await run((tx) =>
      recordCheck(tx, as(), {
        personId: ruth, provider: "Checkr", status: "clear",
        completedOn: "2026-09-01", expiresOn: "2029-09-01",
      }),
    );
    const view = await run((tx) => checksFor(tx, as(), ruth));
    expect(view.checks.length).toBe(2);
    expect(view.expiresOn).toBe("2029-09-01");
  });

  it("holds nothing the provider found", async () => {
    // R21.11. The columns are the whole story: no report, no finding, no notes.
    const [row] = await owner()`
      select * from background_checks where tenant_id = ${tenant} limit 1`;
    expect(Object.keys(row!).sort()).toEqual([
      "completed_on", "created_at", "expires_on", "id", "person_id", "provider", "status",
      "tenant_id",
    ]);
  });

  it("refuses a result with no day behind it", async () => {
    await expect(
      run((tx) => recordCheck(tx, as(), { personId: sam, provider: "Checkr", status: "clear" })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses an expiry before the day it was done", async () => {
    await expect(
      run((tx) => recordCheck(tx, as(), {
        personId: sam, provider: "Checkr", status: "clear",
        completedOn: "2026-02-01", expiresOn: "2025-02-01",
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("takes a pending one with no day, because it has not happened yet", async () => {
    const check = await run((tx) =>
      recordCheck(tx, as(), { personId: sam, provider: "Checkr", status: "pending" }),
    );
    expect(check.status).toBe("pending");
    expect(await run((tx) => clearedForChildren(tx, sam, TODAY))).toBe(false);
  });
});

describe("who may see one (R21.11)", () => {
  it("is owner, admin and pastoral", () => {
    for (const role of ["owner", "admin", "pastoral"] as const) {
      expect(canSeeChecks(role), role).toBe(true);
    }
    for (const role of ["staff", "group_leader", "checkin_volunteer", "member"] as const) {
      expect(canSeeChecks(role), role).toBe(false);
    }
  });

  it("is refused to everybody else, on reading and on writing", async () => {
    for (const role of ["staff", "checkin_volunteer", "member"] as const) {
      await expect(run((tx) => checksFor(tx, as(role), ruth), role), role)
        .rejects.toBeInstanceOf(PermissionError);
      await expect(
        run((tx) => recordCheck(tx, as(role), {
          personId: ruth, provider: "Checkr", status: "clear", completedOn: "2026-02-01",
        }), role),
        role,
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });
});

describe("the list a safeguarding lead opens (R2.10)", () => {
  it("says where everybody with a check stands", async () => {
    const all = await run((tx) => checkStandings(tx, as(), { today: TODAY }));
    expect(all.map((row) => row.name).sort()).toEqual(["Ruth Checked", "Sam Checked"]);
    expect(all.find((row) => row.name === "Ruth Checked")!.standing).toBe("clear");
    expect(all.find((row) => row.name === "Sam Checked")!.standing).toBe("pending");
  });

  it("leaves out anybody nobody has checked", async () => {
    await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Unchecked", lastName: "Checked", lifecycleStatus: "member",
      } as never),
    );
    const all = await run((tx) => checkStandings(tx, as(), { today: TODAY }));
    expect(all.some((row) => row.name.startsWith("Unchecked"))).toBe(false);
  });
});

describe("another church's checks", () => {
  it("are never read", async () => {
    const otherId = await testTenant("checktest2", "Other Check Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      checkStandings(tx, { role: "owner" }, { today: TODAY }),
    );
    expect(theirs).toEqual([]);
    await dropTenants("checktest2");
  });
});
