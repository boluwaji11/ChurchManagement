/**
 * HRT-118. Skills, interests and spiritual gifts (R2.9).
 *
 * The whole feature exists to answer one question when a church is short of
 * somebody: who can do this. So the tests are about the list staying a list,
 * and about that question returning the right people.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  listAbilities, addAbility, renameAbility, setAbilityArchived,
  abilitiesForPerson, setPersonAbility, peopleWith,
} from "../src/repo/abilities";
import { createPerson, listPeople, setPersonArchived } from "../src/repo/people";
import { PermissionError, type TenantRole } from "../src/roles";
import { InvalidInputError, NameTakenError } from "../src/errors";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let driving: string;
let teaching: string;
let prisons: string;
let maria: string;
let carlos: string;
const SLUG = "abilitytest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const make = (firstName: string) =>
  run((tx) => createPerson(tx, as(), { firstName, lastName: "Abilitytest" } as never)).then((p) => p.id);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Ability Test Church");
  driving = (await run((tx) => addAbility(tx, as(), { kind: "skill", name: "Minibus driving" }))).id;
  teaching = (await run((tx) => addAbility(tx, as(), { kind: "gift", name: "Teaching" }))).id;
  prisons = (await run((tx) => addAbility(tx, as(), { kind: "interest", name: "Prison ministry" }))).id;
  maria = await make("Maria");
  carlos = await make("Carlos");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("three lists, not one", () => {
  it("keeps a skill, an interest and a gift apart", async () => {
    const all = await run((tx) => listAbilities(tx));
    expect(all.find((a) => a.name === "Minibus driving")?.kind).toBe("skill");
    expect(all.find((a) => a.name === "Teaching")?.kind).toBe("gift");
    expect(all.find((a) => a.name === "Prison ministry")?.kind).toBe("interest");
  });

  it("allows one name on two different lists", async () => {
    // "Music" is a skill somebody has and a gift somebody claims, and a church
    // that uses both words means two different things by them.
    await run((tx) => addAbility(tx, as(), { kind: "skill", name: "Music" }));
    await run((tx) => addAbility(tx, as(), { kind: "gift", name: "Music" }));
    const music = (await run((tx) => listAbilities(tx))).filter((a) => a.name === "Music");
    expect(music).toHaveLength(2);
  });

  it("refuses the same name twice on one list, whatever the case", async () => {
    await expect(
      run((tx) => addAbility(tx, as(), { kind: "skill", name: "minibus driving" })),
    ).rejects.toBeInstanceOf(NameTakenError);
  });

  it("refuses an empty name and a list that does not exist", async () => {
    await expect(
      run((tx) => addAbility(tx, as(), { kind: "skill", name: "  " })),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      run((tx) => addAbility(tx, as(), { kind: "superpower", name: "Flight" })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is kept by the people who run the church, not by everybody who edits a person", async () => {
    await expect(
      run((tx) => addAbility(tx, as("staff"), { kind: "skill", name: "Welding" }), "staff"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("who can do this", () => {
  it("answers with the people who have it", async () => {
    await run((tx) => setPersonAbility(tx, as(), { personId: maria, abilityId: driving, on: true }));
    await run((tx) => setPersonAbility(tx, as(), { personId: carlos, abilityId: driving, on: true }));
    await run((tx) => setPersonAbility(tx, as(), { personId: maria, abilityId: teaching, on: true }));

    expect((await run((tx) => peopleWith(tx, [driving]))).sort()).toEqual([maria, carlos].sort());
  });

  it("answers two at once with the overlap, which is what recruiting asks for", async () => {
    expect(await run((tx) => peopleWith(tx, [driving, teaching]))).toEqual([maria]);
  });

  it("leaves out somebody who has been archived", async () => {
    const gone = await make("Past");
    await run((tx) => setPersonAbility(tx, as(), { personId: gone, abilityId: driving, on: true }));
    await run((tx) => setPersonArchived(tx, as(), gone, true));
    expect(await run((tx) => peopleWith(tx, [driving]))).not.toContain(gone);
  });

  it("narrows the directory, which is where a church actually asks", async () => {
    const rows = await run((tx) => listPeople(tx, { abilityId: teaching }));
    expect(rows.map((r) => r.id)).toEqual([maria]);
  });

  it("answers nothing when asked for nothing", async () => {
    expect(await run((tx) => peopleWith(tx, []))).toEqual([]);
  });
});

describe("on a person's record", () => {
  it("lists what they have, across all three", async () => {
    const mine = await run((tx) => abilitiesForPerson(tx, maria));
    expect(mine.map((a) => a.name).sort()).toEqual(["Minibus driving", "Teaching"]);
  });

  it("takes one away without touching the list itself", async () => {
    await run((tx) => setPersonAbility(tx, as(), { personId: carlos, abilityId: driving, on: false }));
    expect(await run((tx) => abilitiesForPerson(tx, carlos))).toHaveLength(0);
    expect((await run((tx) => listAbilities(tx))).some((a) => a.id === driving)).toBe(true);
  });

  it("is given by anybody who edits people, not only by an admin", async () => {
    await run(
      (tx) => setPersonAbility(tx, as("staff"), { personId: carlos, abilityId: prisons, on: true }),
      "staff",
    );
    expect(await run((tx) => abilitiesForPerson(tx, carlos))).toHaveLength(1);
  });

  it("is refused to somebody who may not edit people at all", async () => {
    await expect(
      run(
        (tx) => setPersonAbility(tx, as("member"), { personId: carlos, abilityId: driving, on: true }),
        "member",
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("changing the list", () => {
  it("renames without losing who has it", async () => {
    await run((tx) => renameAbility(tx, as(), { id: driving, name: "Bus driving" }));
    expect((await run((tx) => abilitiesForPerson(tx, maria))).map((a) => a.name))
      .toContain("Bus driving");
  });

  it("counts the people on each entry", async () => {
    const row = (await run((tx) => listAbilities(tx))).find((a) => a.id === driving);
    expect(row?.count).toBe(1);
  });

  it("archives rather than deletes, and keeps it on the records that have it", async () => {
    // Somebody recorded as a driver two years ago was a driver two years ago.
    await run((tx) => setAbilityArchived(tx, as(), { id: driving, archived: true }));
    expect((await run((tx) => listAbilities(tx))).some((a) => a.id === driving)).toBe(false);
    expect((await run((tx) => abilitiesForPerson(tx, maria))).map((a) => a.id)).toContain(driving);

    const withArchived = await run((tx) => listAbilities(tx, { includeArchived: true }));
    expect(withArchived.some((a) => a.id === driving)).toBe(true);
  });

  it("refuses to give somebody an archived one", async () => {
    await expect(
      run((tx) => setPersonAbility(tx, as(), { personId: carlos, abilityId: driving, on: true })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("comes back", async () => {
    await run((tx) => setAbilityArchived(tx, as(), { id: driving, archived: false }));
    expect((await run((tx) => listAbilities(tx))).some((a) => a.id === driving)).toBe(true);
  });
});
