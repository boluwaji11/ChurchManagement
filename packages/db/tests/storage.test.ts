/**
 * HRT-18. Hard storage quotas, enforced and visible (R1.16).
 *
 * The check that matters is the one before the bytes are written. A quota
 * discovered on a bill is not a quota.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  getStorageUsage, assertCanStore, recordFile, forgetFile, setChurchLogo,
  humanBytes, listFiles, ONE_MIB, WARN_AT,
} from "../src/repo/storage";
import { getChurch } from "../src/repo/church";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";

let riverside: string;
let northgate: string;

const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

const KEY = (n: string) => `riverside/test/${n}.png`;

beforeAll(async () => {
  const rows = await owner()<{ id: string; slug: string }[]>`
    select id, slug from tenants where slug in ('riverside', 'northgate')`;
  riverside = rows.find((r) => r.slug === "riverside")!.id;
  northgate = rows.find((r) => r.slug === "northgate")!.id;
});

afterAll(async () => {
  await owner()`delete from stored_files where key like 'riverside/test/%'`;
  await owner()`update tenants set logo_key = null, storage_quota_bytes = 2147483648`;
  await closeConnections();
});

const clear = () => owner()`delete from stored_files where key like 'riverside/test/%'`;

describe("what may be stored", () => {
  it("refuses a file type we do not serve", async () => {
    await expect(
      run(riverside, "owner", (tx) =>
        assertCanStore(tx, riverside, {
          purpose: "logo", contentType: "image/svg+xml", bytes: 1000,
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses an empty file and one over its own limit", async () => {
    for (const bytes of [0, 3 * ONE_MIB]) {
      await expect(
        run(riverside, "owner", (tx) =>
          assertCanStore(tx, riverside, { purpose: "logo", contentType: "image/png", bytes }),
        ),
        String(bytes),
      ).rejects.toBeInstanceOf(InvalidInputError);
    }
  });

  it("accepts one inside every limit", async () => {
    const usage = await run(riverside, "owner", (tx) =>
      assertCanStore(tx, riverside, {
        purpose: "logo", contentType: "image/png", bytes: 120_000,
      }),
    );
    expect(usage.quotaBytes).toBeGreaterThan(0);
  });
});

describe("the quota", () => {
  it("refuses bytes that would take the church over it", async () => {
    await clear();
    await owner()`update tenants set storage_quota_bytes = ${500_000} where id = ${riverside}`;

    await run(riverside, "owner", (tx) =>
      recordFile(tx, as(riverside), {
        key: KEY("a"), purpose: "logo", contentType: "image/png", bytes: 400_000,
      }),
    );

    // Under, so this one is fine.
    await run(riverside, "owner", (tx) =>
      assertCanStore(tx, riverside, {
        purpose: "logo", contentType: "image/png", bytes: 90_000,
      }),
    );

    // Over, so this one is refused before anything is written.
    await expect(
      run(riverside, "owner", (tx) =>
        assertCanStore(tx, riverside, {
          purpose: "logo", contentType: "image/png", bytes: 150_000,
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("warns at eighty per cent", async () => {
    await clear();
    await owner()`update tenants set storage_quota_bytes = ${1_000_000} where id = ${riverside}`;

    await run(riverside, "owner", (tx) =>
      recordFile(tx, as(riverside), {
        key: KEY("b"), purpose: "logo", contentType: "image/png", bytes: 700_000,
      }),
    );
    expect((await run(riverside, "owner", (tx) => getStorageUsage(tx, riverside))).warning).toBe(false);

    await run(riverside, "owner", (tx) =>
      recordFile(tx, as(riverside), {
        key: KEY("c"), purpose: "logo", contentType: "image/png", bytes: 120_000,
      }),
    );
    const usage = await run(riverside, "owner", (tx) => getStorageUsage(tx, riverside));
    expect(usage.fraction).toBeGreaterThanOrEqual(WARN_AT);
    expect(usage.warning).toBe(true);
    expect(usage.files).toBe(2);
  });

  it("counts only this church's files", async () => {
    await clear();
    await owner()`update tenants set storage_quota_bytes = ${1_000_000}`;
    await run(riverside, "owner", (tx) =>
      recordFile(tx, as(riverside), {
        key: KEY("d"), purpose: "logo", contentType: "image/png", bytes: 300_000,
      }),
    );

    const theirs = await run(northgate, "owner", (tx) => getStorageUsage(tx, northgate));
    expect(theirs.usedBytes).toBe(0);
    expect(await run(northgate, "owner", (tx) => listFiles(tx))).toEqual([]);
  });
});

describe("the logo", () => {
  it("replacing one forgets the old file, so ten changes cost one logo", async () => {
    await clear();
    await owner()`update tenants set storage_quota_bytes = ${2147483648}`;

    for (const n of ["e", "f"]) {
      await run(riverside, "owner", (tx) =>
        recordFile(tx, as(riverside), {
          key: KEY(n), purpose: "logo", contentType: "image/png", bytes: 100_000,
        }),
      );
    }

    await run(riverside, "owner", (tx) => setChurchLogo(tx, as(riverside), KEY("e")));
    const swapped = await run(riverside, "owner", (tx) => setChurchLogo(tx, as(riverside), KEY("f")));

    expect(swapped.removed).toBe(KEY("e"));
    const usage = await run(riverside, "owner", (tx) => getStorageUsage(tx, riverside));
    expect(usage.files).toBe(1);
    expect((await run(riverside, "owner", (tx) => getChurch(tx, riverside)))?.logoKey).toBe(KEY("f"));
  });

  it("is Owner and Admin", async () => {
    await expect(
      run(riverside, "staff", (tx) => setChurchLogo(tx, as(riverside, "staff"), null)),
    ).rejects.toBeInstanceOf(PermissionError);

    await expect(
      run(riverside, "staff", (tx) => forgetFile(tx, as(riverside, "staff"), KEY("f"))),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("reading a size", () => {
  it("reads as a person would say it", () => {
    expect(humanBytes(512)).toBe("512 B");
    expect(humanBytes(1_400_000)).toBe("1.4 MB");
    expect(humanBytes(2_147_483_648)).toBe("2.1 GB");
  });
});
