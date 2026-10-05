/**
 * HRT-130. Templates, and starting from a plan already run (R11.8).
 *
 * The whole requirement turns on one line: structure comes over, content does
 * not. So the tests say what structure means. The kinds, the titles, the
 * lengths and the order come over. The description, the notes and the files
 * were written for the week they were written for, and they stay there.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { ensurePlan, addItem, getPlan, addItemNote } from "../src/repo/plans";
import {
  listTemplates, saveAsTemplate, renameTemplate, removeTemplate,
  applyTemplate, recentPlans, copyPlan,
} from "../src/repo/plan-templates";
import { addSpecialService } from "../src/repo/services";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
/** The week already run, which everything else copies from. */
let past: string;
let pastPlan: string;
/** The week being planned. */
let next: string;
let nextPlan: string;
const SLUG = "plantemplatestest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const service = async (name: string, occursOn: string) =>
  (await run((tx) => addSpecialService(tx, as(), { name, occursOn, startsAt: "10:00" }))).id;

const itemsOn = async (occurrenceId: string) => {
  const plan = await run((tx) => getPlan(tx, occurrenceId));
  return plan!.items;
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Plan Templates Test Church");

  past = await service("Morning", "2030-09-01");
  pastPlan = (await run((tx) => ensurePlan(tx, as(), past))).id;
  const opener = await run((tx) =>
    addItem(tx, as(), pastPlan, {
      kind: "song",
      title: "Opening song",
      minutes: 6,
      description: "Key of G",
    }),
  );
  await run((tx) =>
    addItem(tx, as(), pastPlan, { kind: "sermon", title: "The sermon", minutes: 30 }),
  );
  await run((tx) =>
    addItem(tx, as(), pastPlan, { kind: "offering", title: "Offering", minutes: 4 }),
  );
  // Content, to prove it stays behind.
  await run((tx) =>
    addItemNote(tx, as(), {
      itemId: opener.id,
      body: "Start a cappella",
      teamId: null,
      positionId: null,
      memberId: null,
    }),
  );

  next = await service("Morning", "2030-09-08");
  nextPlan = (await run((tx) => ensurePlan(tx, as(), next))).id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("copying a plan already run", () => {
  it("offers earlier plans that have something on them, newest first", async () => {
    const sources = await run((tx) => recentPlans(tx, next));
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ occurrenceId: past, items: 3, minutes: 40 });
  });

  it("does not offer the plan being edited, or anything later", async () => {
    const sources = await run((tx) => recentPlans(tx, past));
    expect(sources).toHaveLength(0);
  });

  it("carries the kinds, titles, lengths and order", async () => {
    const result = await run((tx) =>
      copyPlan(tx, as(), { planId: nextPlan, fromOccurrenceId: past }),
    );
    expect(result.added).toBe(3);

    const items = await itemsOn(next);
    expect(items.map((i) => [i.kind, i.title, i.minutes])).toEqual([
      ["song", "Opening song", 6],
      ["sermon", "The sermon", 30],
      ["offering", "Offering", 4],
    ]);
  });

  it("leaves last week's content where it was", async () => {
    const items = await itemsOn(next);
    expect(items.flatMap((i) => i.notes)).toHaveLength(0);
    expect(items.flatMap((i) => i.files)).toHaveLength(0);
    expect(items.map((i) => i.description)).toEqual([null, null, null]);

    // And the plan it came from still has its own.
    const original = await itemsOn(past);
    expect(original.flatMap((i) => i.notes)).toHaveLength(1);
    expect(original[0]!.description).toBe("Key of G");
  });

  it("adds after whatever is already on the plan", async () => {
    await run((tx) =>
      copyPlan(tx, as(), { planId: nextPlan, fromOccurrenceId: past }),
    );
    const items = await itemsOn(next);
    expect(items).toHaveLength(6);
    expect(items[3]!.title).toBe("Opening song");
  });

  it("refuses a plan that is not there", async () => {
    await expect(
      run((tx) => copyPlan(tx, as(), { planId: nextPlan, fromOccurrenceId: next })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("templates", () => {
  it("saves the shape of a plan under a name", async () => {
    const saved = await run((tx) =>
      saveAsTemplate(tx, as(), { planId: pastPlan, name: "  Morning service  " }),
    );
    expect(saved.id).toBeTruthy();

    const list = await run((tx) => listTemplates(tx));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Morning service", items: 3, minutes: 40 });
  });

  it("replaces a template saved again under the same name", async () => {
    await run((tx) =>
      addItem(tx, as(), pastPlan, { kind: "prayer", title: "Closing prayer", minutes: 2 }),
    );
    await run((tx) => saveAsTemplate(tx, as(), { planId: pastPlan, name: "Morning service" }));

    const list = await run((tx) => listTemplates(tx));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ items: 4, minutes: 42 });
  });

  it("refuses a blank name, and an empty plan", async () => {
    await expect(
      run((tx) => saveAsTemplate(tx, as(), { planId: pastPlan, name: "   " })),
    ).rejects.toBeInstanceOf(InvalidInputError);

    const bare = await service("Midweek", "2030-10-01");
    const barePlan = (await run((tx) => ensurePlan(tx, as(), bare))).id;
    await expect(
      run((tx) => saveAsTemplate(tx, as(), { planId: barePlan, name: "Midweek" })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("lays a template onto a plan, after what is there", async () => {
    const target = await service("Carols", "2030-12-24");
    const targetPlan = (await run((tx) => ensurePlan(tx, as(), target))).id;
    const [template] = await run((tx) => listTemplates(tx));

    const result = await run((tx) =>
      applyTemplate(tx, as(), { planId: targetPlan, templateId: template!.id }),
    );
    expect(result.added).toBe(4);

    const items = await itemsOn(target);
    expect(items.map((i) => i.title)).toEqual([
      "Opening song", "The sermon", "Offering", "Closing prayer",
    ]);
    expect(items.flatMap((i) => i.notes)).toHaveLength(0);
  });

  it("renames, and refuses a name another template has", async () => {
    const [template] = await run((tx) => listTemplates(tx));
    await run((tx) => renameTemplate(tx, as(), template!.id, "Sunday morning"));
    expect((await run((tx) => listTemplates(tx)))[0]!.name).toBe("Sunday morning");

    await run((tx) => saveAsTemplate(tx, as(), { planId: pastPlan, name: "Evening" }));
    const evening = (await run((tx) => listTemplates(tx))).find((x) => x.name === "Evening")!;
    await expect(
      run((tx) => renameTemplate(tx, as(), evening.id, "Sunday morning")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("deletes a template and leaves the plans built from it alone", async () => {
    const evening = (await run((tx) => listTemplates(tx))).find((x) => x.name === "Evening")!;
    await run((tx) => removeTemplate(tx, as(), evening.id));

    const list = await run((tx) => listTemplates(tx));
    expect(list.map((x) => x.name)).toEqual(["Sunday morning"]);
    expect(await itemsOn(past)).toHaveLength(4);
  });

  it("is refused to a volunteer", async () => {
    await expect(
      run((tx) => saveAsTemplate(tx, as("member"), { planId: pastPlan, name: "Nope" }), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
    await expect(
      run((tx) => copyPlan(tx, as("member"), { planId: nextPlan, fromOccurrenceId: past }), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
