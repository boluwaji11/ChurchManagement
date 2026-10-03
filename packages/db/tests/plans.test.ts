/**
 * HRT-127. The order of service (R11.1 to R11.3).
 *
 * The running total is the reason anybody opens this screen, so most of this is
 * about the clock: what time each item starts, what time the plan runs to, and
 * that both are right after something is moved, lengthened or taken out.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  getPlan, ensurePlan, updatePlan, addItem, updateItem, removeItem, moveItem,
  reorderItems, runningTimes,
} from "../src/repo/plans";
import { addSpecialService } from "../src/repo/services";
import { PermissionError } from "../src/roles";
import { InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let planId: string;
const SLUG = "planstest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const plan = () => run((tx) => getPlan(tx, service));

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Plans Test Church");
  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-07-07", startsAt: "10:00" }),
  )).id;
  planId = (await run((tx) => ensurePlan(tx, as(), service))).id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("the running total, on its own", () => {
  it("starts each item where the one before it ended", () => {
    const { items, endsAt, minutes } = runningTimes("10:00", [
      { minutes: 15 }, { minutes: 30 }, { minutes: 5 },
    ]);
    expect(items.map((i) => i.startsAt)).toEqual(["10:00", "10:15", "10:45"]);
    expect(endsAt).toBe("10:50");
    expect(minutes).toBe(50);
  });

  it("wraps past midnight rather than printing 25:30", () => {
    const { endsAt } = runningTimes("23:00", [{ minutes: 90 }]);
    expect(endsAt).toBe("00:30");
  });

  it("gives the service start back for a plan with nothing on it", () => {
    expect(runningTimes("09:30", []).endsAt).toBe("09:30");
  });
});

describe("the plan", () => {
  it("is not created with the gathering", async () => {
    const other = await run((tx) =>
      addSpecialService(tx, as(), { name: "Evening", occursOn: "2030-07-07", startsAt: "18:00" }),
    );
    expect(await run((tx) => getPlan(tx, other.id))).toBeNull();
  });

  it("is created once, however many times the editor is opened", async () => {
    const again = await run((tx) => ensurePlan(tx, as(), service));
    expect(again.id).toBe(planId);
  });

  it("carries the series and the theme", async () => {
    await run((tx) => updatePlan(tx, as(), planId, { series: "Advent", theme: "Waiting" }));
    const current = await plan();
    expect(current?.series).toBe("Advent");
    expect(current?.theme).toBe("Waiting");
  });

  it("is not something a check-in volunteer can start", async () => {
    await expect(
      run((tx) => ensurePlan(tx, as("checkin_volunteer"), service), "checkin_volunteer"),
    ).rejects.toThrow(PermissionError);
  });
});

describe("items", () => {
  it("go on in order, each starting when the last one ends", async () => {
    await run((tx) => addItem(tx, as(), planId, { kind: "song", title: "Opening", minutes: 10 }));
    await run((tx) => addItem(tx, as(), planId, { kind: "prayer", title: "Welcome", minutes: 5 }));
    await run((tx) => addItem(tx, as(), planId, { kind: "sermon", title: "Teaching", minutes: 30 }));

    const current = await plan();
    expect(current!.items.map((i) => i.title)).toEqual(["Opening", "Welcome", "Teaching"]);
    expect(current!.items.map((i) => i.startsAt)).toEqual(["10:00", "10:10", "10:15"]);
    expect(current!.endsAt).toBe("10:45");
    expect(current!.minutes).toBe(45);
  });

  it("refuse a blank title, an unknown kind and a silly length", async () => {
    await expect(
      run((tx) => addItem(tx, as(), planId, { kind: "song", title: "   ", minutes: 5 })),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      run((tx) => addItem(tx, as(), planId, { kind: "nonsense" as never, title: "X", minutes: 5 })),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      run((tx) => addItem(tx, as(), planId, { kind: "song", title: "X", minutes: 601 })),
    ).rejects.toThrow(InvalidInputError);
  });

  it("take a zero, because an item can be a line on the page", async () => {
    const made = await run((tx) =>
      addItem(tx, as(), planId, { kind: "custom", title: "Hand over", minutes: 0 }),
    );
    expect((await plan())!.items.find((i) => i.id === made.id)?.minutes).toBe(0);
    await run((tx) => removeItem(tx, as(), made.id));
  });

  it("move the clock when one is lengthened", async () => {
    const current = await plan();
    const first = current!.items[0]!;
    await run((tx) =>
      updateItem(tx, as(), first.id, { kind: "song", title: "Opening", minutes: 20 }),
    );

    const after = await plan();
    expect(after!.items.map((i) => i.startsAt)).toEqual(["10:00", "10:20", "10:25"]);
    expect(after!.endsAt).toBe("10:55");
  });

  it("move up and down, and the clock follows", async () => {
    const before = await plan();
    const second = before!.items[1]!;

    await run((tx) => moveItem(tx, as(), { planId, id: second.id, direction: "up" }));
    const after = await plan();
    expect(after!.items.map((i) => i.title)).toEqual(["Welcome", "Opening", "Teaching"]);
    expect(after!.items.map((i) => i.startsAt)).toEqual(["10:00", "10:05", "10:25"]);
  });

  it("stay put at the ends rather than falling off", async () => {
    const before = await plan();
    const first = before!.items[0]!;
    await run((tx) => moveItem(tx, as(), { planId, id: first.id, direction: "up" }));
    expect((await plan())!.items.map((i) => i.title)).toEqual(before!.items.map((i) => i.title));
  });

  it("reorder wholesale", async () => {
    const before = await plan();
    const reversed = [...before!.items].reverse().map((i) => i.id);
    await run((tx) => reorderItems(tx, as(), planId, reversed));
    expect((await plan())!.items.map((i) => i.id)).toEqual(reversed);
  });

  it("come off, and the end time comes back", async () => {
    const before = await plan();
    const sermon = before!.items.find((i) => i.kind === "sermon")!;
    await run((tx) => removeItem(tx, as(), sermon.id));

    const after = await plan();
    expect(after!.items.map((i) => i.kind)).not.toContain("sermon");
    expect(after!.minutes).toBe(before!.minutes - sermon.minutes);
  });

  it("belong to one plan, so another gathering's is empty", async () => {
    const other = await run((tx) =>
      addSpecialService(tx, as(), { name: "Late", occursOn: "2030-07-14", startsAt: "19:00" }),
    );
    const second = await run((tx) => ensurePlan(tx, as(), other.id));
    expect(second.items).toHaveLength(0);
    expect(second.endsAt).toBe("19:00");
  });
});
