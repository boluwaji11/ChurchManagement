/**
 * HRT-237, HRT-238. Funds, and the counting session (R13.9 to R13.15).
 *
 * The control that matters is the batch: two counters, a declared total, and no
 * close while the entered total differs unless somebody writes down why.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { listFunds, writeFund, setFundArchived, fundTotals } from "../src/repo/funds";
import {
  openBatch, updateBatch, closeBatch, reopenBatch, listBatches, recordGift, removeGift,
  listGifts, givingTotals,
} from "../src/repo/giving";
import { createPerson } from "../src/repo/members";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let general: string;
let building: string;
/** R13.11. Two people count the bag. */
let countOne: string;
let countTwo: string;
const SLUG = "givingtest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Giving Test Church");
  general = (await run((tx) => writeFund(tx, as(), { name: "General", code: "gen" }))).id;
  building = (await run((tx) =>
    writeFund(tx, as(), { name: "Building", code: "bld", restricted: true }),
  )).id;

  countOne = (await run((tx) =>
    createPerson(tx, as(), { firstName: "Grace", lastName: "Givingtest" } as never),
  )).id;
  countTwo = (await run((tx) =>
    createPerson(tx, as(), { firstName: "Harold", lastName: "Givingtest" } as never),
  )).id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("funds", () => {
  it("keeps the church's funds, with restricted ones marked", async () => {
    const list = await run((tx) => listFunds(tx));
    expect(list.map((one) => one.name)).toEqual(["General", "Building"]);
    expect(list.find((one) => one.name === "Building")!.restricted).toBe(true);
    expect(list.find((one) => one.name === "General")!.code).toBe("GEN");
  });

  it("refuses a blank name and a name already used", async () => {
    await expect(run((tx) => writeFund(tx, as(), { name: " " })))
      .rejects.toBeInstanceOf(InvalidInputError);
    await expect(run((tx) => writeFund(tx, as(), { name: "General" })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is refused to somebody who does not run the giving", async () => {
    await expect(run((tx) => writeFund(tx, as("staff"), { name: "Nope" }), "staff"))
      .rejects.toBeInstanceOf(PermissionError);
  });
});

describe("a counting session", () => {
  let batch: string;

  it("opens on a declared total", async () => {
    batch = (await run((tx) =>
      openBatch(tx, as(), {
        name: "Morning count",
        receivedOn: "2030-10-06",
        expectedCents: 15_000,
      }),
    )).id;

    const [row] = await run((tx) => listBatches(tx));
    expect(row!.expectedCents).toBe(15_000);
    expect(row!.enteredCents).toBe(0);
    expect(row!.closed).toBe(false);
  });

  it("takes the lines, and counts what has been entered", async () => {
    await run((tx) =>
      recordGift(tx, as(), {
        fundId: general, batchId: batch, amountCents: 10_000,
        method: "cash", receivedOn: "2030-10-06",
      }),
    );
    await run((tx) =>
      recordGift(tx, as(), {
        fundId: building, batchId: batch, amountCents: 4_000,
        method: "cheque", reference: "1041", receivedOn: "2030-10-06",
      }),
    );

    const [row] = await run((tx) => listBatches(tx));
    expect(row!.enteredCents).toBe(14_000);
    expect(row!.lines).toBe(2);
  });

  it("refuses to close while it is short of two counters", async () => {
    await expect(run((tx) => closeBatch(tx, as(), batch)))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses to close on a variance with nothing written down", async () => {
    await run((tx) =>
      updateBatch(tx, as(), batch, { counterOneId: countOne, counterTwoId: countTwo }),
    );
    // 14,000 entered against 15,000 declared.
    await expect(run((tx) => closeBatch(tx, as(), batch)))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("closes when the entered total matches the declaration", async () => {
    await run((tx) =>
      recordGift(tx, as(), {
        fundId: general, batchId: batch, amountCents: 1_000,
        method: "cash", receivedOn: "2030-10-06",
      }),
    );
    await run((tx) => closeBatch(tx, as(), batch));

    const [row] = await run((tx) => listBatches(tx));
    expect(row!.closed).toBe(true);
    expect(row!.enteredCents).toBe(row!.expectedCents);

    // A closed count is the record of a deposit, so it stops taking lines.
    await expect(
      run((tx) =>
        recordGift(tx, as(), {
          fundId: general, batchId: batch, amountCents: 500,
          method: "cash", receivedOn: "2030-10-06",
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("counts the totals, and keeps a closed count from taking more", async () => {
    const totals = await run((tx) => givingTotals(tx, { from: "2030-01-01", to: "2030-12-31" }));
    expect(totals.cents).toBe(15_000);
    expect(totals.gifts).toBe(3);

    const byFund = await run((tx) => fundTotals(tx, { from: "2030-01-01", to: "2030-12-31" }));
    expect(byFund[general]!.cents).toBe(11_000);
    expect(byFund[building]!.cents).toBe(4_000);
  });

  it("reads the lines back with the fund and the giver", async () => {
    const lines = await run((tx) => listGifts(tx, as(), { batchId: batch }));
    expect(lines).toHaveLength(3);
    expect(lines.map((one) => one.fundName)).toContain("Building");
    expect(lines.every((one) => one.memberName === null)).toBe(true);
  });

  it("hides the amounts from somebody without the permission", async () => {
    const lines = await run((tx) => listGifts(tx, as("staff"), { batchId: batch }), "staff");
    expect(lines.every((one) => one.amountCents === 0)).toBe(true);
  });

  it("takes a line back off while the count is open", async () => {
    await run((tx) => reopenBatch(tx, as(), batch));
    const lines = await run((tx) => listGifts(tx, as(), { batchId: batch }));
    await run((tx) => removeGift(tx, as(), lines[0]!.id));
    expect(await run((tx) => listGifts(tx, as(), { batchId: batch }))).toHaveLength(2);
  });

  it("refuses a gift to an archived fund", async () => {
    const spare = (await run((tx) => writeFund(tx, as(), { name: "Mission" }))).id;
    await run((tx) => setFundArchived(tx, as(), spare, true));
    await expect(
      run((tx) =>
        recordGift(tx, as(), {
          fundId: spare, amountCents: 500, method: "cash", receivedOn: "2030-10-06",
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("takes a gift in kind with no amount and a description", async () => {
    await expect(
      run((tx) =>
        recordGift(tx, as(), {
          fundId: general, amountCents: 0, method: "in_kind", receivedOn: "2030-10-06",
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);

    const { id } = await run((tx) =>
      recordGift(tx, as(), {
        fundId: general, amountCents: 0, method: "in_kind",
        inKindDescription: "A piano", receivedOn: "2030-10-06",
      }),
    );
    expect(id).toBeTruthy();

    // R13.13. It stays out of the cash totals: 10,000 and 4,000 are still
    // there, and the piano adds nothing.
    const totals = await run((tx) => givingTotals(tx, { from: "2030-01-01", to: "2030-12-31" }));
    expect(totals.cents).toBe(14_000);
  });
});
