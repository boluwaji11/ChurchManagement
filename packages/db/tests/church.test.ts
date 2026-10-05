/**
 * HRT-15. Church settings (R1.1).
 *
 * The timezone here decides what "Sunday" means for every report in R18, and
 * the legal name goes on the giving statements in R13.14. Both are read on
 * screens a member sees, so the checks are stricter than they look.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  getChurch, updateChurch, isKnownTimezone,
  listServiceTimes, addServiceTime, removeServiceTime, canManageChurch,
} from "../src/repo/church";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";

let riverside: string;
let before: Awaited<ReturnType<typeof getChurch>>;

const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

beforeAll(async () => {
  const rows = await owner()<{ id: string }[]>`select id from tenants where slug = 'riverside'`;
  riverside = rows[0]!.id;
  before = await run(riverside, "owner", (tx) => getChurch(tx, riverside));
});

afterAll(async () => {
  // Put the church back, so the other suites see what they expect.
  await owner()`
    update tenants set name = ${before!.name}, legal_name = ${before!.legalName},
      timezone = ${before!.timezone}, address_line1 = ${before!.addressLine1},
      city = ${before!.city}, region = ${before!.region}, postal_code = ${before!.postalCode},
      phone = ${before!.phone}, website = ${before!.website}, brand_hue = ${before!.brandHue}
    where id = ${riverside}`;
  await owner()`delete from service_times where tenant_id = ${riverside}`;
  await closeConnections();
});

describe("the profile", () => {
  it("saves the fields a giving statement and a report need", async () => {
    const saved = await run(riverside, "owner", (tx) =>
      updateChurch(tx, as(riverside), {
        name: "Riverside Fellowship",
        legalName: "Riverside Fellowship of Austin, Inc.",
        timezone: "America/Chicago",
        addressLine1: "1400 Barton Springs Road",
        city: "Austin",
        region: "TX",
        postalCode: "78704",
        phone: "(512) 555 0100",
        website: "https://riverside.example.org",
        brandHue: "teal",
      }),
    );

    expect(saved.legalName).toBe("Riverside Fellowship of Austin, Inc.");
    expect(saved.brandHue).toBe("teal");

    const read = await run(riverside, "owner", (tx) => getChurch(tx, riverside));
    expect(read?.city).toBe("Austin");
  });

  it("trims blanks down to nothing recorded", async () => {
    const saved = await run(riverside, "owner", (tx) =>
      updateChurch(tx, as(riverside), {
        name: "  Riverside Fellowship  ",
        legalName: "   ",
        timezone: "America/Chicago",
      }),
    );
    expect(saved.name).toBe("Riverside Fellowship");
    expect(saved.legalName).toBeNull();
  });

  it("refuses an empty name and a timezone the runtime does not know", async () => {
    await expect(
      run(riverside, "owner", (tx) =>
        updateChurch(tx, as(riverside), { name: "   ", timezone: "America/Chicago" }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);

    await expect(
      run(riverside, "owner", (tx) =>
        updateChurch(tx, as(riverside), { name: "Riverside", timezone: "Mars/Olympus_Mons" }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("knows a real timezone from an invented one", () => {
    expect(isKnownTimezone("America/New_York")).toBe(true);
    expect(isKnownTimezone("America/Nowhere")).toBe(false);
  });
});

describe("service times", () => {
  it("lists Sunday first, then by the clock", async () => {
    await owner()`delete from service_times where tenant_id = ${riverside}`;
    for (const [name, day, at] of [
      ["Midweek", 3, "19:00"],
      ["Second service", 0, "11:00"],
      ["First service", 0, "09:00"],
    ] as const) {
      await run(riverside, "owner", (tx) =>
        addServiceTime(tx, as(riverside), { name, dayOfWeek: day, startsAt: at }),
      );
    }

    const rows = await run(riverside, "owner", (tx) => listServiceTimes(tx));
    expect(rows.map((r) => r.name)).toEqual(["First service", "Second service", "Midweek"]);
  });

  it("refuses a day outside the week and a time that is not one", async () => {
    for (const bad of [
      { name: "Bad", dayOfWeek: 7, startsAt: "09:00" },
      { name: "Bad", dayOfWeek: 0, startsAt: "9am" },
      { name: "Bad", dayOfWeek: 0, startsAt: "25:00" },
      { name: "  ", dayOfWeek: 0, startsAt: "09:00" },
    ]) {
      await expect(
        run(riverside, "owner", (tx) => addServiceTime(tx, as(riverside), bad)),
        JSON.stringify(bad),
      ).rejects.toBeInstanceOf(InvalidInputError);
    }
  });

  it("removes one", async () => {
    const added = await run(riverside, "owner", (tx) =>
      addServiceTime(tx, as(riverside), { name: "Evening", dayOfWeek: 0, startsAt: "18:30" }),
    );
    await run(riverside, "owner", (tx) => removeServiceTime(tx, as(riverside), added.id));

    const rows = await run(riverside, "owner", (tx) => listServiceTimes(tx));
    expect(rows.map((r) => r.name)).not.toContain("Evening");
  });
});

describe("permissions", () => {
  it("is Owner and Admin", () => {
    expect(canManageChurch("owner")).toBe(true);
    expect(canManageChurch("admin")).toBe(true);
    expect(canManageChurch("staff")).toBe(false);
  });

  it("refuses staff, who may edit members but may not rename the church", async () => {
    await expect(
      run(riverside, "staff", (tx) =>
        updateChurch(tx, as(riverside, "staff"), {
          name: "Something else", timezone: "America/Chicago",
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);

    await expect(
      run(riverside, "staff", (tx) =>
        addServiceTime(tx, as(riverside, "staff"), {
          name: "First service", dayOfWeek: 0, startsAt: "09:00",
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
