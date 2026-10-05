/**
 * HRT-134. Plan history (R11.12).
 *
 * Read out of the audit log, so what is tested is the reading: that the right
 * rows are found for one plan, that an update says which fields moved, and
 * that running the gathering in live mode leaves no trail, because a history
 * drowned in twenty "now on item four" rows is a history nobody scrolls.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  ensurePlan, addItem, updateItem, removeItem, updatePlan, addItemNote,
} from "../src/repo/plans";
import { planHistory } from "../src/repo/plan-history";
import { startLive, moveLive, stopLive } from "../src/repo/live";
import { addSpecialService } from "../src/repo/services";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let planId: string;
let itemId: string;
/** A second plan, to prove one plan's history is only its own. */
let otherPlan: string;
const SLUG = "planhistorytest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const history = () => run((tx) => planHistory(tx, planId));

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Plan History Test Church");

  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-12-01", startsAt: "10:00" }),
  )).id;
  planId = (await run((tx) => ensurePlan(tx, as(), service))).id;

  const other = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Midweek", occursOn: "2030-12-04", startsAt: "19:00" }),
  )).id;
  otherPlan = (await run((tx) => ensurePlan(tx, as(), other))).id;
  await run((tx) =>
    addItem(tx, as(), otherPlan, { kind: "custom", title: "Somebody else's item", minutes: 5 }),
  );
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("plan history", () => {
  it("records an item being added, by title", async () => {
    itemId = (await run((tx) =>
      addItem(tx, as(), planId, { kind: "song", title: "Opening song", minutes: 6 }),
    )).id;

    const [latest] = await history();
    expect(latest).toMatchObject({
      action: "insert",
      entity: "plan_items",
      subject: "Opening song",
    });
  });

  it("says which fields moved on an edit", async () => {
    await run((tx) =>
      updateItem(tx, as(), itemId, { kind: "song", title: "Opening song", minutes: 9 }),
    );

    const [latest] = await history();
    expect(latest).toMatchObject({ action: "update", entity: "plan_items" });
    expect(latest!.fields).toEqual(["minutes"]);
  });

  it("records the series and the theme on the plan itself", async () => {
    await run((tx) =>
      updatePlan(tx, as(), planId, { series: "Advent", theme: "Waiting", title: null }),
    );

    const [latest] = await history();
    expect(latest!.entity).toBe("service_plans");
    expect(latest!.fields).toEqual(["series", "theme"]);
  });

  it("records a note by its first words", async () => {
    await run((tx) =>
      addItemNote(tx, as(), {
        itemId,
        body: "Start a cappella",
        teamId: null,
        positionId: null,
        memberId: null,
      }),
    );

    const [latest] = await history();
    expect(latest).toMatchObject({
      action: "insert",
      entity: "plan_item_notes",
      subject: "Start a cappella",
    });
  });

  it("records an item being taken off, still naming it", async () => {
    const extra = await run((tx) =>
      addItem(tx, as(), planId, { kind: "media", title: "The video", minutes: 3 }),
    );
    await run((tx) => removeItem(tx, as(), extra.id));

    const [latest] = await history();
    expect(latest).toMatchObject({
      action: "delete",
      entity: "plan_items",
      subject: "The video",
    });
  });

  it("names who made the change, by role", async () => {
    const entries = await history();
    expect(entries.every((entry) => entry.actorRole === "owner")).toBe(true);
  });

  it("leaves nothing behind when the gathering is run in live mode", async () => {
    const before = await history();

    await run((tx) => startLive(tx, as(), service));
    await run((tx) => moveLive(tx, as(), service, "next"));
    await run((tx) => stopLive(tx, as(), service));

    const after = await history();
    expect(after).toHaveLength(before.length);
  });

  it("holds one plan's changes and not another's", async () => {
    const entries = await history();
    expect(entries.map((e) => e.subject)).not.toContain("Somebody else's item");

    const theirs = await run((tx) => planHistory(tx, otherPlan));
    expect(theirs.map((e) => e.subject)).toContain("Somebody else's item");
  });

  it("reads newest first", async () => {
    const entries = await history();
    const times = entries.map((e) => Date.parse(e.at));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});
