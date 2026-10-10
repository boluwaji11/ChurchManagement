/**
 * HRT-88. A picture on a group, with the quota behind it (R9.2, R1.16).
 *
 * The finder is a wall of cards, and a photograph of eight members round a table
 * says what a paragraph cannot. What is tested is the part that costs a church
 * something: that the picture goes through the one path that checks the quota,
 * and that replacing one forgets the old file rather than charging for both.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  createGroup, getGroup, setGroupPhoto, seedGroupTypes, listGroupTypes,
} from "../src/repo/groups";
import { findGroups } from "../src/repo/group-finder";
import {
  recordFile, listFiles, getStorageUsage, assertCanStore, UPLOAD_RULES, ONE_MIB,
} from "../src/repo/storage";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let group: string;
const SLUG = "groupphototest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const KEY = (n: string) => `${SLUG}/group_photo/${n}.png`;

const store = (n: string, bytes = 200_000) =>
  run((tx) =>
    recordFile(tx, as(), {
      key: KEY(n), purpose: "group_photo", contentType: "image/png", bytes,
    }),
  );

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Group Photo Test Church");
  /* R9.1. Every group is one of the kinds the church keeps. */
  await run((tx) => seedGroupTypes(tx, as()));
  const [kind] = await run((tx) => listGroupTypes(tx));
  group = (await run((tx) =>
    createGroup(tx, as(), { name: "Tuesday group", typeId: kind!.id }),
  )).id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("what may be stored", () => {
  it("takes the image types and refuses everything else", async () => {
    expect(UPLOAD_RULES.group_photo.types).toEqual([
      "image/png", "image/jpeg", "image/webp",
    ]);

    await expect(
      run((tx) =>
        assertCanStore(tx, tenant, {
          purpose: "group_photo", contentType: "application/pdf", bytes: 1000,
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses one over five mebibytes", async () => {
    await expect(
      run((tx) =>
        assertCanStore(tx, tenant, {
          purpose: "group_photo", contentType: "image/png", bytes: 6 * ONE_MIB,
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("the picture", () => {
  it("starts with none, and the group reads as having none", async () => {
    expect((await run((tx) => getGroup(tx, group)))!.photoKey).toBeNull();
  });

  it("goes on the group, and counts against the quota", async () => {
    await store("a");
    await run((tx) => setGroupPhoto(tx, as(), group, KEY("a")));

    expect((await run((tx) => getGroup(tx, group)))!.photoKey).toBe(KEY("a"));
    expect((await run((tx) => getStorageUsage(tx, tenant))).usedBytes).toBe(200_000);
  });

  it("reaches the finder, which is the card it was put there for", async () => {
    const found = await run((tx) => findGroups(tx, { manage: true }));
    expect(found.find((g) => g.id === group)!.photoKey).toBe(KEY("a"));
  });

  it("forgets the old one when it is replaced, so four tries cost one picture", async () => {
    await store("b");
    const swapped = await run((tx) => setGroupPhoto(tx, as(), group, KEY("b")));

    expect(swapped.removed).toBe(KEY("a"));
    expect((await run((tx) => listFiles(tx))).map((f) => f.key)).toEqual([KEY("b")]);
    expect((await run((tx) => getStorageUsage(tx, tenant))).usedBytes).toBe(200_000);
  });

  it("comes off, and says which object to delete from the bucket", async () => {
    const cleared = await run((tx) => setGroupPhoto(tx, as(), group, null));

    expect(cleared.removed).toBe(KEY("b"));
    expect((await run((tx) => getGroup(tx, group)))!.photoKey).toBeNull();
    expect(await run((tx) => listFiles(tx))).toEqual([]);
  });

  it("refuses a group that is not there", async () => {
    await expect(
      run((tx) => setGroupPhoto(tx, as(), "00000000-0000-0000-0000-000000000000", null)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is refused to anybody who cannot change the groups", async () => {
    await expect(
      run((tx) => setGroupPhoto(tx, as("member"), group, KEY("a")), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
