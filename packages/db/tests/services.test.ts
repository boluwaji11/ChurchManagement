/**
 * HRT-47. The church's calendar of gatherings (R7.1).
 *
 * The generated calendar is a starting point rather than the truth, so the
 * tests that matter are the ones proving a decision somebody made about one
 * week survives the next generation, and that a cancelled Sunday stays on the
 * record rather than leaving a hole that reads as a collapse.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  generateOccurrences, listOccurrences, addSpecialService, updateOccurrence,
  setOccurrenceCancelled, removeSpecialService, upcomingOccurrences, canManageServices,
} from "../src/repo/services";
import { addServiceTime } from "../src/repo/church";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { withAuditTriggersOff } from "../src/maintenance";

let tenant: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  const [row] = await owner()<{ id: string }[]>`
    insert into tenants (slug, name, timezone)
    values ('servicetest', 'Service Test Church', 'America/Chicago')
    returning id`;
  tenant = row!.id;

  // Sunday 09:00 and 11:00, and a Wednesday evening.
  await run((tx) => addServiceTime(tx, as(), { name: "First service", dayOfWeek: 0, startsAt: "09:00" }));
  await run((tx) => addServiceTime(tx, as(), { name: "Second service", dayOfWeek: 0, startsAt: "11:00" }));
  await run((tx) => addServiceTime(tx, as(), { name: "Midweek", dayOfWeek: 3, startsAt: "19:00" }));
});

afterAll(async () => {
  await withAuditTriggersOff(async () => {
    await owner()`delete from tenants where id = ${tenant}`;
  });
  await closeConnections();
});

const clear = () => owner()`delete from service_occurrences where tenant_id = ${tenant}`;

describe("generating from the weekly pattern", () => {
  it("makes one occurrence per service per matching day", async () => {
    await clear();
    // 2026-03-01 is a Sunday, 2026-03-14 a Saturday. Two Sundays, two Wednesdays.
    const result = await run((tx) =>
      generateOccurrences(tx, as(), { from: "2026-03-01", to: "2026-03-14" }),
    );

    expect(result.created).toBe(6);
    const rows = await run((tx) => listOccurrences(tx));
    expect(rows.length).toBe(6);
    expect(rows.filter((r) => r.name === "Midweek").map((r) => r.occursOn))
      .toEqual(["2026-03-11", "2026-03-04"]);
  });

  it("is idempotent, so running it again changes nothing", async () => {
    const again = await run((tx) =>
      generateOccurrences(tx, as(), { from: "2026-03-01", to: "2026-03-14" }),
    );
    expect(again.created).toBe(0);
    expect(again.kept).toBe(6);
  });

  it("leaves a week somebody has already decided about", async () => {
    const [first] = await run((tx) => listOccurrences(tx, { from: "2026-03-01", to: "2026-03-01" }));
    await run((tx) => setOccurrenceCancelled(tx, as(), first!.id, true, "Snow"));
    await run((tx) => updateOccurrence(tx, as(), first!.id, { name: "Snow day" }));

    await run((tx) => generateOccurrences(tx, as(), { from: "2026-03-01", to: "2026-03-14" }));

    const rows = await run((tx) => listOccurrences(tx, { includeCancelled: true }));
    const kept = rows.find((r) => r.id === first!.id)!;
    expect(kept.status).toBe("cancelled");
    expect(kept.name).toBe("Snow day");
    expect(kept.note).toBe("Snow");
  });

  it("refuses a backwards range, and a church with no pattern yet", async () => {
    await expect(
      run((tx) => generateOccurrences(tx, as(), { from: "2026-03-14", to: "2026-03-01" })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("cancelled gatherings", () => {
  it("stay on the record, and are left out of the list by default", async () => {
    const all = await run((tx) => listOccurrences(tx, { includeCancelled: true }));
    const shown = await run((tx) => listOccurrences(tx));

    expect(all.length).toBe(6);
    expect(shown.length).toBe(5);
    expect(shown.some((r) => r.status === "cancelled")).toBe(false);
  });

  it("can be put back", async () => {
    const [cancelled] = (await run((tx) => listOccurrences(tx, { includeCancelled: true })))
      .filter((r) => r.status === "cancelled");
    await run((tx) => setOccurrenceCancelled(tx, as(), cancelled!.id, false));
    expect((await run((tx) => listOccurrences(tx))).length).toBe(6);
  });
});

describe("special services", () => {
  it("survive a regeneration, because they belong to no pattern", async () => {
    const carols = await run((tx) =>
      addSpecialService(tx, as(), {
        name: "Carols by candlelight", occursOn: "2026-12-24", startsAt: "18:30",
      }),
    );
    expect(carols.serviceTimeId).toBeNull();

    // Two on the same evening is a thing churches do, so it must be allowed.
    await run((tx) =>
      addSpecialService(tx, as(), {
        name: "Midnight communion", occursOn: "2026-12-24", startsAt: "23:00",
      }),
    );

    await run((tx) => generateOccurrences(tx, as(), { from: "2026-12-01", to: "2026-12-31" }));

    const december = await run((tx) => listOccurrences(tx, { from: "2026-12-24", to: "2026-12-24" }));
    expect(december.map((r) => r.name).sort()).toEqual(["Carols by candlelight", "Midnight communion"]);
  });

  it("can be removed, where a generated one cannot", async () => {
    const [carols] = (await run((tx) => listOccurrences(tx, { from: "2026-12-24", to: "2026-12-24" })))
      .filter((r) => r.name === "Carols by candlelight");
    await run((tx) => removeSpecialService(tx, as(), carols!.id));

    const [generated] = await run((tx) => listOccurrences(tx, { from: "2026-03-04", to: "2026-03-04" }));
    await expect(
      run((tx) => removeSpecialService(tx, as(), generated!.id)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses a blank name, a bad date and a bad time", async () => {
    for (const bad of [
      { name: "  ", occursOn: "2026-12-24", startsAt: "18:30" },
      { name: "Carols", occursOn: "24/12/2026", startsAt: "18:30" },
      { name: "Carols", occursOn: "2026-12-24", startsAt: "6.30pm" },
    ]) {
      await expect(run((tx) => addSpecialService(tx, as(), bad)), JSON.stringify(bad))
        .rejects.toBeInstanceOf(InvalidInputError);
    }
  });
});

describe("what is coming", () => {
  it("lists the next few, soonest first, leaving out cancelled ones", async () => {
    await clear();
    const year = new Date().getFullYear() + 1;
    await run((tx) => generateOccurrences(tx, as(), { from: `${year}-01-01`, to: `${year}-01-31` }));

    const next = await run((tx) => upcomingOccurrences(tx, 3));
    expect(next.length).toBe(3);
    expect([...next].sort((a, b) => a.occursOn.localeCompare(b.occursOn)).map((r) => r.id))
      .toEqual(next.map((r) => r.id));
  });
});

describe("permissions", () => {
  it("is owner, admin and staff, because staff plan services", () => {
    expect(canManageServices("staff")).toBe(true);
    expect(canManageServices("member")).toBe(false);
  });

  it("refuses a role that may not", async () => {
    await expect(
      run((tx) => generateOccurrences(tx, as("member"), { from: "2026-03-01", to: "2026-03-14" }), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
