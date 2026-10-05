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
  addService, topUpCalendar, stopRepeating, HORIZON_WEEKS,
  setHeadcount, listForAttendance, datesFor,
} from "../src/repo/services";
import { addServiceTime } from "../src/repo/church";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { withAuditTriggersOff } from "../src/maintenance";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  const rowId = await testTenant("servicetest", "Service Test Church");
  tenant = rowId;

  // Sunday 09:00 and 11:00, and a Wednesday evening.
  await run((tx) => addServiceTime(tx, as(), { name: "First service", dayOfWeek: 0, startsAt: "09:00" }));
  await run((tx) => addServiceTime(tx, as(), { name: "Second service", dayOfWeek: 0, startsAt: "11:00" }));
  await run((tx) => addServiceTime(tx, as(), { name: "Midweek", dayOfWeek: 3, startsAt: "19:00" }));
});

afterAll(async () => {
  await dropTenants("servicetest");
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

describe("one concept, with a repeat", () => {
  it("a repeating service fills the calendar ahead on its own", async () => {
    await clear();
    await owner()`delete from service_times where tenant_id = ${tenant}`;

    const result = await run((tx) =>
      addService(tx, as(), {
        name: "Sunday morning", occursOn: "2026-04-05", startsAt: "09:00", frequency: "weekly",
      }),
    );

    // 26 weeks from the first date, inclusive of it.
    expect(result.created).toBe(HORIZON_WEEKS + 1);
    expect(result.serviceTimeId).not.toBeNull();

    const rows = await run((tx) => listOccurrences(tx, { from: "2026-04-05", to: "2026-04-19" }));
    expect(rows.map((r) => r.occursOn)).toEqual(["2026-04-19", "2026-04-12", "2026-04-05"]);
  });

  it("a service that does not repeat is a single date", async () => {
    const before = (await run((tx) => listOccurrences(tx))).length;
    const result = await run((tx) =>
      addService(tx, as(), { name: "Good Friday", occursOn: "2026-04-03", startsAt: "19:00" }),
    );

    expect(result.created).toBe(1);
    expect(result.serviceTimeId).toBeNull();
    expect((await run((tx) => listOccurrences(tx))).length).toBe(before + 1);
  });

  it("tops up quietly, and adds nothing on a second read", async () => {
    const first = await run((tx) => topUpCalendar(tx, as()));
    const second = await run((tx) => topUpCalendar(tx, as()));
    expect(second).toBe(0);
    expect(first).toBeGreaterThanOrEqual(0);
  });

  it("stopping a repeat takes the future and leaves the past", async () => {
    await clear();
    await owner()`delete from service_times where tenant_id = ${tenant}`;

    const { serviceTimeId } = await run((tx) =>
      addService(tx, as(), {
        name: "Midweek", occursOn: "2020-01-01", startsAt: "19:00", frequency: "weekly",
      }),
    );

    // Past dates from 2020, and the top-up writes the ones from today onward.
    await run((tx) => topUpCalendar(tx, as()));
    const before = await run((tx) => listOccurrences(tx, { includeCancelled: true }));
    const past = before.filter((r) => r.occursOn < new Date().toISOString().slice(0, 10)).length;
    expect(past).toBeGreaterThan(0);

    await run((tx) => stopRepeating(tx, as(), serviceTimeId!));

    const after = await run((tx) => listOccurrences(tx, { includeCancelled: true }));
    expect(after.length).toBe(past);
    expect(after.every((r) => r.occursOn < new Date().toISOString().slice(0, 10))).toBe(true);
  });
});

describe("headcounts", () => {
  it("records three numbers and totals them", async () => {
    await clear();
    const service = await run((tx) =>
      addService(tx, as(), { name: "Sunday", occursOn: "2026-02-01", startsAt: "09:00" }),
    );
    const [row] = await run((tx) => listOccurrences(tx));

    const counted = await run((tx) =>
      setHeadcount(tx, as(), row!.id, { adults: 84, children: 23, visitors: 4, note: "Rain" }),
    );

    expect(counted.total).toBe(111);
    expect(counted.note).toBe("Rain");
    expect(service.created).toBe(1);
  });

  it("tells a blank apart from a zero", async () => {
    const [row] = await run((tx) => listOccurrences(tx));

    // Nobody counted.
    const blank = await run((tx) => setHeadcount(tx, as(), row!.id, {}));
    expect(blank.total).toBeNull();

    // Nobody came, which is a different fact and a real one.
    const zero = await run((tx) =>
      setHeadcount(tx, as(), row!.id, { adults: 0, children: 0, visitors: 0 }),
    );
    expect(zero.total).toBe(0);
  });

  it("refuses a count that is not a whole number of members", async () => {
    const [row] = await run((tx) => listOccurrences(tx));
    for (const adults of [-1, 2.5]) {
      await expect(
        run((tx) => setHeadcount(tx, as(), row!.id, { adults })),
        String(adults),
      ).rejects.toBeInstanceOf(InvalidInputError);
    }
  });

  it("refuses a count against a service that did not happen", async () => {
    const [row] = await run((tx) => listOccurrences(tx));
    await run((tx) => setOccurrenceCancelled(tx, as(), row!.id, true, "Snow"));

    await expect(
      run((tx) => setHeadcount(tx, as(), row!.id, { adults: 10 })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("lists what has happened, most recent first, saying which are counted", async () => {
    await clear();
    for (const [name, on] of [["A", "2026-01-04"], ["B", "2026-01-11"]] as const) {
      await run((tx) => addService(tx, as(), { name, occursOn: on, startsAt: "09:00" }));
    }
    // A service still to come is left out: there is nothing to count yet.
    const year = new Date().getFullYear() + 1;
    await run((tx) => addService(tx, as(), { name: "Later", occursOn: `${year}-06-07`, startsAt: "09:00" }));

    const rows = await run((tx) => listForAttendance(tx));
    expect(rows.map((r) => r.name)).toEqual(["B", "A"]);
    expect(rows.every((r) => r.counted)).toBe(false);

    await run((tx) => setHeadcount(tx, as(), rows[0]!.id, { adults: 90 }));
    const again = await run((tx) => listForAttendance(tx));
    expect(again[0]!.counted).toBe(true);
    expect(again[0]!.total).toBe(90);
  });
});

describe("editing a service", () => {
  it("changes the name, the date, the time and the note", async () => {
    await clear();
    await run((tx) => addService(tx, as(), { name: "Sunday", occursOn: "2026-05-03", startsAt: "09:00" }));
    const [row] = await run((tx) => listOccurrences(tx));

    const edited = await run((tx) =>
      updateOccurrence(tx, as(), row!.id, {
        name: "Sunday morning", occursOn: "2026-05-02", startsAt: "18:00", note: "Moved to the Saturday",
      }),
    );

    expect(edited.name).toBe("Sunday morning");
    expect(edited.occursOn).toBe("2026-05-02");
    expect(edited.startsAt).toBe("18:00");
    expect(edited.note).toBe("Moved to the Saturday");
  });

  it("refuses a blank name, a bad date and a bad time", async () => {
    const [row] = await run((tx) => listOccurrences(tx));
    for (const bad of [{ name: " " }, { occursOn: "2/5/2026" }, { startsAt: "6pm" }]) {
      await expect(run((tx) => updateOccurrence(tx, as(), row!.id, bad)), JSON.stringify(bad))
        .rejects.toBeInstanceOf(InvalidInputError);
    }
  });
});

describe("how often it repeats (R7.1)", () => {
  const monday = "2026-03-02"; // a Monday

  it("every week", () => {
    const dates = datesFor("2026-03-01", "2026-03-31", {
      dayOfWeek: 1, frequency: "weekly", anchorOn: monday, untilOn: null,
    });
    expect(dates).toEqual(["2026-03-02", "2026-03-09", "2026-03-16", "2026-03-23", "2026-03-30"]);
  });

  it("every two weeks, counted from the first date however far ahead you look", () => {
    const repeat = { dayOfWeek: 1, frequency: "fortnightly" as const, anchorOn: monday, untilOn: null };
    expect(datesFor("2026-03-01", "2026-03-31", repeat))
      .toEqual(["2026-03-02", "2026-03-16", "2026-03-30"]);

    // A window starting later keeps the same parity rather than restarting.
    expect(datesFor("2026-03-10", "2026-04-15", repeat))
      .toEqual(["2026-03-16", "2026-03-30", "2026-04-13"]);
  });

  it("every month, on the same weekday of the month", () => {
    // 2026-03-10 is the second Tuesday of March.
    const dates = datesFor("2026-03-01", "2026-06-30", {
      dayOfWeek: 2, frequency: "monthly", anchorOn: "2026-03-10", untilOn: null,
    });
    expect(dates).toEqual(["2026-03-10", "2026-04-14", "2026-05-12", "2026-06-09"]);
  });

  it("skips a month with no fifth of that weekday", () => {
    // The fifth Sunday. February 2027 has four, so it has none.
    const dates = datesFor("2027-01-01", "2027-04-30", {
      dayOfWeek: 0, frequency: "monthly", anchorOn: "2026-11-29", untilOn: null,
    });
    // Inventing one in the fourth week, or in the next month, would be a
    // service the church never said it holds.
    expect(dates).toEqual(["2027-01-31", "2027-05-30"].filter((d) => d <= "2027-04-30"));
  });

  it("stops on the end date", () => {
    const dates = datesFor("2026-03-01", "2026-12-31", {
      dayOfWeek: 1, frequency: "weekly", anchorOn: monday, untilOn: "2026-03-16",
    });
    expect(dates).toEqual(["2026-03-02", "2026-03-09", "2026-03-16"]);
  });

  it("writes the end date onto the series, and refuses one before the start", async () => {
    await clear();
    await owner()`delete from service_times where tenant_id = ${tenant}`;

    await run((tx) =>
      addService(tx, as(), {
        name: "Lent course", occursOn: "2026-02-18", startsAt: "19:30",
        frequency: "weekly", untilOn: "2026-03-25",
      }),
    );
    const rows = await run((tx) => listOccurrences(tx));
    expect(rows[0]!.occursOn).toBe("2026-03-25");
    expect(rows.length).toBe(6);

    await expect(
      run((tx) =>
        addService(tx, as(), {
          name: "Backwards", occursOn: "2026-05-01", startsAt: "09:00",
          frequency: "weekly", untilOn: "2026-04-01",
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("does not top up past the end date", async () => {
    const before = (await run((tx) => listOccurrences(tx))).length;
    await run((tx) => topUpCalendar(tx, as()));
    expect((await run((tx) => listOccurrences(tx))).length).toBe(before);
  });
});
