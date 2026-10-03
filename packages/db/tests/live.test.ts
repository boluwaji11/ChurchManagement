/**
 * HRT-133. Live mode (R11.11).
 *
 * The state is a row because the team follows on their own phones, so what is
 * tested is that the row says what the gathering is on, that only somebody who
 * can run services can move it, and that pressing next at the end of the plan
 * ends the gathering rather than falling off it.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { ensurePlan, addItem } from "../src/repo/plans";
import { liveFor, startLive, moveLive, goLiveTo, stopLive } from "../src/repo/live";
import { addSpecialService } from "../src/repo/services";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let planId: string;
const items: string[] = [];
const SLUG = "livetest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const state = () => run((tx) => liveFor(tx, service));

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Live Test Church");
  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-11-10", startsAt: "10:00" }),
  )).id;
  planId = (await run((tx) => ensurePlan(tx, as(), service))).id;

  for (const [kind, title, minutes] of [
    ["song", "Opening song", 6],
    ["sermon", "The sermon", 30],
    ["prayer", "Closing prayer", 3],
  ] as const) {
    const made = await run((tx) => addItem(tx, as(), planId, { kind, title, minutes }));
    items.push(made.id);
  }
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("live mode", () => {
  it("reads as not running before anybody starts it", async () => {
    const live = await state();
    expect(live).toMatchObject({ running: false, currentId: null, startedAt: null });
    expect(live!.items.map((i) => i.title)).toEqual([
      "Opening song", "The sermon", "Closing prayer",
    ]);
  });

  it("starts on the first item, with both clocks set", async () => {
    await run((tx) => startLive(tx, as(), service));

    const live = await state();
    expect(live!.running).toBe(true);
    expect(live!.currentId).toBe(items[0]);
    expect(live!.startedAt).toBeTruthy();
    expect(live!.itemAt).toBeTruthy();
  });

  it("moves on, and the item clock moves with it while the gathering clock stays", async () => {
    const before = await state();
    await run((tx) => moveLive(tx, as(), service, "next"));

    const live = await state();
    expect(live!.currentId).toBe(items[1]);
    expect(live!.startedAt).toBe(before!.startedAt);
    expect(live!.itemAt).not.toBe(before!.itemAt);
  });

  it("goes back, and stays put at the first item", async () => {
    await run((tx) => moveLive(tx, as(), service, "back"));
    expect((await state())!.currentId).toBe(items[0]);

    await run((tx) => moveLive(tx, as(), service, "back"));
    expect((await state())!.currentId).toBe(items[0]);
  });

  it("jumps straight to an item, for when the order changes on the floor", async () => {
    await run((tx) => goLiveTo(tx, as(), service, items[2]!));
    expect((await state())!.currentId).toBe(items[2]);
  });

  it("refuses a jump to an item on somebody else's plan", async () => {
    const other = (await run((tx) =>
      addSpecialService(tx, as(), { name: "Midweek", occursOn: "2030-11-13", startsAt: "19:00" }),
    )).id;
    const otherPlan = (await run((tx) => ensurePlan(tx, as(), other))).id;
    const stray = await run((tx) =>
      addItem(tx, as(), otherPlan, { kind: "custom", title: "Stray", minutes: 5 }),
    );

    await expect(
      run((tx) => goLiveTo(tx, as(), service, stray.id)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("ends the gathering when next runs off the end of the plan", async () => {
    const result = await run((tx) => moveLive(tx, as(), service, "next"));
    expect(result.currentId).toBeNull();

    const live = await state();
    expect(live).toMatchObject({ running: false, currentId: null, itemAt: null });
  });

  it("refuses to move a gathering that is not running", async () => {
    await expect(
      run((tx) => moveLive(tx, as(), service, "next")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses to start a plan with nothing on it", async () => {
    const bare = (await run((tx) =>
      addSpecialService(tx, as(), { name: "Bare", occursOn: "2030-11-17", startsAt: "10:00" }),
    )).id;
    await run((tx) => ensurePlan(tx, as(), bare));

    await expect(
      run((tx) => startLive(tx, as(), bare)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("lets a member read it and refuses to let them run it", async () => {
    await run((tx) => startLive(tx, as(), service));
    expect((await run((tx) => liveFor(tx, service), "member"))!.running).toBe(true);

    await expect(
      run((tx) => moveLive(tx, as("member"), service, "next"), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
    await expect(
      run((tx) => stopLive(tx, as("member"), service), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("stops, and leaves the plan itself alone", async () => {
    await run((tx) => stopLive(tx, as(), service));

    const live = await state();
    expect(live).toMatchObject({ running: false, currentId: null, startedAt: null });
    expect(live!.items).toHaveLength(3);
  });
});
