/**
 * HRT-129. Files on a plan item (R11.7).
 *
 * The bytes go through the one upload path, which already checks the type, the
 * size and the quota. What is tested here is the join: that a file belongs to
 * an item, that the same file cannot be hung on the same item twice, and that
 * taking one off also takes its ledger row, so a church is not paying quota for
 * something nothing points at.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { ensurePlan, addItem, getPlan, attachToItem, detachFromItem } from "../src/repo/plans";
import { recordFile, listFiles, assertCanStore, UPLOAD_RULES } from "../src/repo/storage";
import { addSpecialService } from "../src/repo/services";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let planId: string;
let itemId: string;
const SLUG = "planfilestest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const store = (name: string, contentType = "application/pdf") =>
  run((tx) =>
    recordFile(tx, as(), {
      key: `${SLUG}/plan_item/${name}`,
      purpose: "plan_item",
      contentType,
      bytes: 1024,
    }),
  );

const filesOnItem = async () => {
  const plan = await run((tx) => getPlan(tx, service));
  return plan!.items.find((i) => i.id === itemId)!.files;
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Plan Files Test Church");
  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-09-01", startsAt: "10:00" }),
  )).id;
  planId = (await run((tx) => ensurePlan(tx, as(), service))).id;
  itemId = (await run((tx) =>
    addItem(tx, as(), planId, { kind: "song", title: "Opening", minutes: 10 }),
  )).id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("what may be attached", () => {
  it("takes a chart, a track, a sheet and an image", async () => {
    for (const type of ["application/pdf", "audio/mpeg", "text/plain", "image/png"]) {
      await expect(
        run((tx) =>
          assertCanStore(tx, tenant, { purpose: "plan_item", contentType: type, bytes: 1024 }),
        ),
      ).resolves.toBeDefined();
    }
  });

  it("refuses video, because sermon video is a non-goal", async () => {
    await expect(
      run((tx) =>
        assertCanStore(tx, tenant, {
          purpose: "plan_item", contentType: "video/mp4", bytes: 1024,
        }),
      ),
    ).rejects.toThrow(InvalidInputError);
  });

  it("refuses something past the size limit", async () => {
    await expect(
      run((tx) =>
        assertCanStore(tx, tenant, {
          purpose: "plan_item",
          contentType: "application/pdf",
          bytes: UPLOAD_RULES.plan_item.maxBytes + 1,
        }),
      ),
    ).rejects.toThrow(InvalidInputError);
  });
});

describe("hanging one off an item", () => {
  it("shows on the plan, with the name a musician reads", async () => {
    const file = await store("chart.pdf");
    await run((tx) => attachToItem(tx, as(), { itemId, fileId: file.id, label: "  Chord chart  " }));

    const [attached] = await filesOnItem();
    expect(attached?.label).toBe("Chord chart");
    expect(attached?.contentType).toBe("application/pdf");
    expect(attached?.key).toContain("chart.pdf");
  });

  it("keeps the order they went on in", async () => {
    const second = await store("track.mp3", "audio/mpeg");
    await run((tx) => attachToItem(tx, as(), { itemId, fileId: second.id }));
    expect((await filesOnItem()).map((f) => f.contentType))
      .toEqual(["application/pdf", "audio/mpeg"]);
  });

  it("refuses the same file on the same item twice", async () => {
    const [first] = await filesOnItem();
    await expect(
      run((tx) => attachToItem(tx, as(), { itemId, fileId: first!.fileId })),
    ).rejects.toThrow(InvalidInputError);
  });

  it("is not something a check-in volunteer can do", async () => {
    const file = await store("nope.pdf");
    await expect(
      run(
        (tx) => attachToItem(tx, as("checkin_volunteer"), { itemId, fileId: file.id }),
        "checkin_volunteer",
      ),
    ).rejects.toThrow(PermissionError);
  });
});

describe("taking one off", () => {
  it("says which object to remove, and forgets the ledger row", async () => {
    const before = await run((tx) => listFiles(tx, "plan_item"));
    const [attached] = await filesOnItem();

    const removed = await run((tx) => detachFromItem(tx, as(), attached!.id));
    expect(removed?.key).toBe(attached!.key);

    const after = await run((tx) => listFiles(tx, "plan_item"));
    expect(after.length).toBe(before.length - 1);
    expect(after.map((f) => f.key)).not.toContain(attached!.key);
  });

  it("leaves the rest of the item alone", async () => {
    expect(await filesOnItem()).toHaveLength(1);
  });

  it("says so when it is already gone", async () => {
    await expect(
      run((tx) => detachFromItem(tx, as(), "00000000-0000-0000-0000-000000000000")),
    ).rejects.toThrow(InvalidInputError);
  });
});
