/**
 * HRT-56. Finding a family at the station (R8.3, R8.4).
 *
 * The design case is 09:58 with forty families queuing. What matters is that
 * the two things a parent says without thinking, the last four digits of their
 * phone and a name, both return the whole household, and that one church's
 * families are never another's.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { lookupHouseholds } from "../src/repo/lookup";
import { createPerson } from "../src/repo/people";
import { withAuditTriggersOff } from "../src/maintenance";
import type { TenantRole } from "../src/roles";

let tenant: string;
const ASOF = "2026-09-30";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  const [row] = await owner()<{ id: string }[]>`
    insert into tenants (slug, name, timezone)
    values ('lookuptest', 'Lookup Test Church', 'America/Chicago')
    returning id`;
  tenant = row!.id;

  const mother = await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Elena", lastName: "Ochoa", lifecycleStatus: "member",
      householdName: "Ochoa", householdRole: "head", dateOfBirth: "1988-04-02",
    } as never),
  );

  // Written the way somebody typed it into the form, punctuation and all, since
  // that is what the lookup has to see through.
  await owner()`
    insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
    values (${tenant}, ${mother.id}, 'phone', 'mobile', '(512) 555-0134', true)`;

  const [household] = await owner()<{ household_id: string }[]>`
    select household_id from household_memberships where person_id = ${mother.id}`;

  for (const child of [
    { firstName: "Mia", dateOfBirth: "2023-06-11" },
    { firstName: "Daniel", preferredName: "Danny", dateOfBirth: "2019-02-20" },
  ]) {
    await run((tx) =>
      createPerson(tx, as(), {
        ...child, lastName: "Ochoa", lifecycleStatus: "member",
        householdId: household!.household_id, householdRole: "child",
      } as never),
    );
  }

  // Another family, so a match has something to be wrong about.
  await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Grace", lastName: "Whitfield", lifecycleStatus: "member",
      householdName: "Whitfield", householdRole: "head",
    } as never),
  );
});

afterAll(async () => {
  await withAuditTriggersOff(async () => {
    await owner()`delete from tenants where id = ${tenant}`;
  });
  await closeConnections();
});

describe("what a parent types", () => {
  it("finds the household from the last four digits of a phone number", async () => {
    const matches = await run((tx) => lookupHouseholds(tx, "0134", { asOf: ASOF }));
    expect(matches.length).toBe(1);
    expect(matches[0]!.name).toBe("Ochoa");
    expect(matches[0]!.people.map((p) => p.name).sort()).toEqual(["Danny", "Elena", "Mia"]);
  });

  it("ignores how the number was written down", async () => {
    for (const typed of ["5550134", "512 555 0134", "555-0134"]) {
      const matches = await run((tx) => lookupHouseholds(tx, typed, { asOf: ASOF }));
      expect(matches.map((m) => m.name), typed).toEqual(["Ochoa"]);
    }
  });

  it("finds the household from a surname, a first name, or what a child is called", async () => {
    for (const typed of ["ochoa", "Elena", "mia", "danny"]) {
      const matches = await run((tx) => lookupHouseholds(tx, typed, { asOf: ASOF }));
      expect(matches.map((m) => m.name), typed).toEqual(["Ochoa"]);
      expect(matches[0]!.people.length, typed).toBe(3);
    }
  });

  it("finds it from a full name typed the way it is said", async () => {
    const matches = await run((tx) => lookupHouseholds(tx, "elena ochoa", { asOf: ASOF }));
    expect(matches.map((m) => m.name)).toEqual(["Ochoa"]);
  });

  it("says nothing for one letter, rather than every family in the church", async () => {
    expect(await run((tx) => lookupHouseholds(tx, "o", { asOf: ASOF }))).toEqual([]);
    expect(await run((tx) => lookupHouseholds(tx, "  ", { asOf: ASOF }))).toEqual([]);
  });

  it("finds nobody when nobody matches", async () => {
    expect(await run((tx) => lookupHouseholds(tx, "zzzz", { asOf: ASOF }))).toEqual([]);
  });
});

describe("what comes back", () => {
  it("puts the children first, youngest first, which is the order the desk works in", async () => {
    const [match] = await run((tx) => lookupHouseholds(tx, "ochoa", { asOf: ASOF }));
    expect(match!.people.map((p) => p.name)).toEqual(["Mia", "Danny", "Elena"]);
  });

  it("says who is a child, from their date of birth", async () => {
    const [match] = await run((tx) => lookupHouseholds(tx, "ochoa", { asOf: ASOF }));
    const byName = Object.fromEntries(match!.people.map((p) => [p.name, p]));
    expect(byName["Mia"]!.isChild).toBe(true);
    expect(byName["Danny"]!.isChild).toBe(true);
    expect(byName["Elena"]!.isChild).toBe(false);
  });

  it("gives an age in months, so a room can be suggested from it", async () => {
    const [match] = await run((tx) => lookupHouseholds(tx, "mia", { asOf: ASOF }));
    const mia = match!.people.find((p) => p.name === "Mia");
    expect(mia!.ageMonths).toBe(39);
  });

  it("calls a person what they are called rather than what they are named", async () => {
    const [match] = await run((tx) => lookupHouseholds(tx, "daniel", { asOf: ASOF }));
    const daniel = match!.people.find((p) => p.firstName === "Daniel");
    expect(daniel!.name).toBe("Danny");
  });

  it("finds somebody who lives in no household", async () => {
    const alone = await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Marcus", lastName: "Alone", lifecycleStatus: "visitor",
      } as never),
    );
    const matches = await run((tx) => lookupHouseholds(tx, "marcus", { asOf: ASOF }));
    expect(matches.length).toBe(1);
    expect(matches[0]!.householdId).toBeNull();
    expect(matches[0]!.people.map((p) => p.id)).toEqual([alone.id]);
  });
});

describe("another church's families", () => {
  it("are never returned", async () => {
    const [other] = await owner()<{ id: string }[]>`
      insert into tenants (slug, name, timezone)
      values ('lookuptest2', 'Other Lookup Church', 'America/Chicago')
      returning id`;
    const otherId = other!.id;

    await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      createPerson(tx, { tenantId: otherId, role: "owner" }, {
        firstName: "Elena", lastName: "Ochoa", lifecycleStatus: "member",
      } as never),
    );

    const mine = await run((tx) => lookupHouseholds(tx, "ochoa", { asOf: ASOF }));
    expect(mine.length).toBe(1);
    expect(mine[0]!.people.length).toBe(3);

    await withAuditTriggersOff(async () => {
      await owner()`delete from tenants where id = ${otherId}`;
    });
  });
});

describe("what the station has to know (R8.10)", () => {
  it("brings the allergy and the medical note back with the family", async () => {
    const [match] = await run((tx) => lookupHouseholds(tx, "ochoa", { asOf: ASOF }));
    const mia = match!.people.find((p) => p.name === "Mia")!;

    await owner()`
      update people set allergies = 'Peanuts', medical_note = 'Inhaler in bag'
      where id = ${mia.id}`;

    const [again] = await run((tx) => lookupHouseholds(tx, "ochoa", { asOf: ASOF }));
    const updated = again!.people.find((p) => p.name === "Mia")!;
    expect(updated.allergies).toBe("Peanuts");
    expect(updated.medicalNote).toBe("Inhaler in bag");

    // A child with nothing recorded says nothing, rather than saying clear.
    const danny = again!.people.find((p) => p.name === "Danny")!;
    expect(danny.allergies).toBeNull();
  });
});
