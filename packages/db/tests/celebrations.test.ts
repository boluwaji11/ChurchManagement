/**
 * HRT-27. Birthdays and anniversaries, by month and by week (R2.11).
 *
 * The parts that go wrong here are the edges of the window: a week that crosses
 * new year, a birthday on 29 February in a year that has no 29 February, and a
 * couple who both carry the marriage milestone and should be read out once.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  listCelebrations, monthWindow, weekWindow,
} from "../src/repo/celebrations";
import { createPerson, setPersonArchived } from "../src/repo/members";
import { addMilestone } from "../src/repo/milestones";
import { addRelationship } from "../src/repo/relationships";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "celebrationstest";
const ids: Record<string, string> = {};

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>) => withTenant({ tenantId: tenant, role: "owner" }, work);

const person = async (firstName: string, dateOfBirth?: string) => {
  const made = await run((tx) =>
    createPerson(tx, as(), {
      firstName, lastName: "Celebrationstest", dateOfBirth,
    } as never),
  );
  ids[firstName] = made.id;
  return made.id;
};

const names = (list: { name: string }[]) => list.map((c) => c.name.split(" ")[0]);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Celebrations Test Church");

  await person("Ada", "1984-10-07");
  await person("Boma", "1990-10-31");
  await person("Chi", "2000-02-29");
  await person("Dayo", "1975-01-02");
  await person("Esi", "1999-12-30");
  await person("Femi");
  await person("Gold", "1960-10-07");

  // A married couple, both carrying the milestone, and both in October.
  await person("Hana", "1988-03-04");
  await person("Idris", "1986-07-19");
  await run((tx) =>
    addRelationship(tx, as(), {
      memberId: ids.Hana!, relatedMemberId: ids.Idris!, kind: "spouse",
    }),
  );
  for (const id of [ids.Hana!, ids.Idris!]) {
    await run((tx) =>
      addMilestone(tx, as(), { memberId: id, kind: "marriage", occurredOn: "2012-10-20" }),
    );
  }

  // Somebody married whose spouse is not in the church's records.
  await person("Jide", "1980-06-06");
  await run((tx) =>
    addMilestone(tx, as(), { memberId: ids.Jide!, kind: "marriage", occurredOn: "2005-10-22" }),
  );

  // Archived, so off every list.
  await person("Kemi", "1992-10-09");
  await run((tx) => setPersonArchived(tx, as(), ids.Kemi!, true));
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("a month", () => {
  it("holds everyone whose day falls in it, and nobody else", async () => {
    const found = names(await run((tx) => listCelebrations(tx, monthWindow(2026, 10))));
    expect(found).toContain("Ada");
    expect(found).toContain("Boma");
    expect(found).toContain("Gold");
    expect(found).not.toContain("Dayo");
    expect(found).not.toContain("Femi");
  });

  it("leaves out archived members", async () => {
    const found = names(await run((tx) => listCelebrations(tx, monthWindow(2026, 10))));
    expect(found).not.toContain("Kemi");
  });

  it("is in the order the days fall", async () => {
    const days = (await run((tx) => listCelebrations(tx, monthWindow(2026, 10)))).map((c) => c.on);
    expect([...days].sort()).toEqual(days);
  });

  it("says the age somebody reaches, not the one they have", async () => {
    const list = await run((tx) => listCelebrations(tx, monthWindow(2026, 10)));
    expect(list.find((c) => c.name.startsWith("Ada"))?.years).toBe(42);
    expect(list.find((c) => c.name.startsWith("Gold"))?.years).toBe(66);
  });

  it("dates each one in the year that was asked about", async () => {
    const list = await run((tx) => listCelebrations(tx, monthWindow(2031, 10)));
    expect(list.find((c) => c.name.startsWith("Ada"))?.on).toBe("2031-10-07");
    expect(list.find((c) => c.name.startsWith("Ada"))?.years).toBe(47);
  });
});

describe("a week", () => {
  it("runs seven days from the day asked about", async () => {
    expect(weekWindow("2026-10-05")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
  });

  it("holds the days inside it", async () => {
    const found = names(await run((tx) => listCelebrations(tx, weekWindow("2026-10-05"))));
    expect(found).toContain("Ada");
    expect(found).not.toContain("Boma");
  });

  it("crosses new year", async () => {
    const window = weekWindow("2026-12-28");
    expect(window).toEqual({ from: "2026-12-28", to: "2027-01-03" });

    const list = await run((tx) => listCelebrations(tx, window));
    expect(names(list)).toContain("Esi");
    expect(names(list)).toContain("Dayo");
    expect(list.find((c) => c.name.startsWith("Esi"))?.on).toBe("2026-12-30");
    expect(list.find((c) => c.name.startsWith("Dayo"))?.on).toBe("2027-01-02");
  });
});

describe("29 February", () => {
  it("is itself in a leap year", async () => {
    const list = await run((tx) => listCelebrations(tx, monthWindow(2028, 2)));
    expect(list.find((c) => c.name.startsWith("Chi"))?.on).toBe("2028-02-29");
  });

  it("is held on the 28th in a year that has no 29th", async () => {
    const list = await run((tx) => listCelebrations(tx, monthWindow(2026, 2)));
    expect(list.find((c) => c.name.startsWith("Chi"))?.on).toBe("2026-02-28");
  });
});

describe("anniversaries", () => {
  it("reads a couple out once, with both names", async () => {
    const list = await run((tx) => listCelebrations(tx, monthWindow(2026, 10)));
    const theirs = list.filter((c) => c.kind === "anniversary" && (
      c.name.startsWith("Hana") || c.name.startsWith("Idris")
    ));
    expect(theirs).toHaveLength(1);
    expect(theirs[0]!.partnerName).toBeTruthy();
    expect(theirs[0]!.years).toBe(14);
  });

  it("holds somebody whose spouse the church has no record of", async () => {
    const list = await run((tx) => listCelebrations(tx, monthWindow(2026, 10)));
    const his = list.find((c) => c.kind === "anniversary" && c.name.startsWith("Jide"));
    expect(his?.partnerName).toBeNull();
    expect(his?.years).toBe(21);
  });

  it("does not put a birthday and an anniversary on the same row", async () => {
    const list = await run((tx) => listCelebrations(tx, monthWindow(2026, 10)));
    const kinds = new Set(list.map((c) => c.kind));
    expect(kinds).toEqual(new Set(["birthday", "anniversary"]));
  });
});
