/**
 * HRT-236. The kinds of plan item are the church's own list (R11.2).
 *
 * A plan item stores a slug, so the test that matters is that renaming a kind
 * leaves the plans alone and that a kind the church wrote itself can be filed
 * against.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { ensurePlan, addItem, getPlan } from "../src/repo/plans";
import {
  listItemKinds, addItemKind, renameItemKind, setItemKindArchived, BUILT_IN_KINDS,
} from "../src/repo/item-kinds";
import { addSpecialService } from "../src/repo/services";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let occurrence: string;
let plan: string;
const SLUG = "itemkindstest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Item Kinds Test Church");
  occurrence = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-10-06", startsAt: "10:00" }),
  )).id;
  plan = (await run((tx) => ensurePlan(tx, as(), occurrence))).id;
});

afterAll(async () => {
  await dropTenants([SLUG]);
  await closeConnections();
});

describe("the kinds of plan item", () => {
  it("starts every church with ours, named by the product", async () => {
    const kinds = await run((tx) => listItemKinds(tx, tenant));
    expect(kinds.map((one) => one.slug)).toEqual([...BUILT_IN_KINDS]);
    expect(kinds.every((one) => one.name === null)).toBe(true);
  });

  it("takes a kind the church runs, and files an item under it", async () => {
    await run((tx) => addItemKind(tx, as(), "Testimony"));
    const kinds = await run((tx) => listItemKinds(tx, tenant));
    const own = kinds.find((one) => one.name === "Testimony")!;
    expect(own.slug).toBe("testimony");

    await run((tx) => addItem(tx, as(), plan, { kind: "testimony", title: "Ruth", minutes: 5 }));
    const items = (await run((tx) => getPlan(tx, occurrence)))!.items;
    expect(items.map((one) => one.kind)).toContain("testimony");
  });

  it("renames without touching the plans", async () => {
    const own = (await run((tx) => listItemKinds(tx, tenant))).find((one) => one.slug === "testimony")!;
    await run((tx) => renameItemKind(tx, as(), own.id, "Story"));

    const kinds = await run((tx) => listItemKinds(tx, tenant));
    expect(kinds.find((one) => one.slug === "testimony")!.name).toBe("Story");
    const items = (await run((tx) => getPlan(tx, occurrence)))!.items;
    expect(items.map((one) => one.kind)).toContain("testimony");
  });

  it("refuses a blank name, a name already taken, and an unknown kind", async () => {
    await expect(run((tx) => addItemKind(tx, as(), "  "))).rejects.toBeInstanceOf(InvalidInputError);
    await expect(run((tx) => addItemKind(tx, as(), "Story"))).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      run((tx) => addItem(tx, as(), plan, { kind: "nothing-like-it", title: "X", minutes: 5 })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("archives a kind, and the item filed under it keeps it", async () => {
    const own = (await run((tx) => listItemKinds(tx, tenant))).find((one) => one.slug === "testimony")!;
    await run((tx) => setItemKindArchived(tx, as(), own.id, true));

    expect((await run((tx) => listItemKinds(tx, tenant))).map((one) => one.slug))
      .not.toContain("testimony");
    const items = (await run((tx) => getPlan(tx, occurrence)))!.items;
    expect(items.map((one) => one.kind)).toContain("testimony");

    // And nothing new can be filed under it while it is away.
    await expect(
      run((tx) => addItem(tx, as(), plan, { kind: "testimony", title: "Again", minutes: 5 })),
    ).rejects.toBeInstanceOf(InvalidInputError);

    await run((tx) => setItemKindArchived(tx, as(), own.id, false));
  });

  it("is refused to a volunteer", async () => {
    await expect(
      run((tx) => addItemKind(tx, as("member"), "Nope"), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
