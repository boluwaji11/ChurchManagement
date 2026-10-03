/**
 * HRT-128. Notes on an item, and who each one is for (R11.6).
 *
 * The point is that the drummer reads the drummer's note instead of reading
 * forty of them, so most of this is the filter: who a note reaches, and that a
 * note addressed to a position follows whoever is playing it rather than
 * whoever was playing it when it was written.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  ensurePlan, addItem, getPlan, addItemNote, removeItemNote, notesFor,
  addressableFor, readerFor, type ItemNote,
} from "../src/repo/plans";
import { assign, unassign, assignmentsForTeam } from "../src/repo/schedule";
import { seedTeams, listTeams, getTeam, addToTeam } from "../src/repo/serving";
import { createPerson } from "../src/repo/people";
import { addSpecialService } from "../src/repo/services";
import { InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let planId: string;
let itemId: string;
let worship: string;
let drums: string;
let keys: string;
const ids: Record<string, string> = {};
const SLUG = "plannotestest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>) => withTenant({ tenantId: tenant, role: "owner" }, work);

const notesOnItem = async (): Promise<ItemNote[]> => {
  const plan = await run((tx) => getPlan(tx, service));
  return plan!.items.find((i) => i.id === itemId)!.notes;
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Plan Notes Test Church");
  await run((tx) => seedTeams(tx, as()));

  worship = (await run((tx) => listTeams(tx))).find((t) => t.name === "Worship")!.id;
  const team = await run((tx) => getTeam(tx, worship));
  drums = team!.positions.find((p) => p.name === "Drums")!.id;
  keys = team!.positions.find((p) => p.name === "Keys")!.id;

  for (const name of ["Ada", "Boma"]) {
    ids[name] = (await run((tx) =>
      createPerson(tx, as(), { firstName: name, lastName: "Plannotestest" } as never),
    )).id;
    await run((tx) => addToTeam(tx, as(), { teamId: worship, personId: ids[name]! }));
  }

  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-08-04", startsAt: "10:00" }),
  )).id;

  planId = (await run((tx) => ensurePlan(tx, as(), service))).id;
  itemId = (await run((tx) =>
    addItem(tx, as(), planId, { kind: "song", title: "Opening", minutes: 10 }),
  )).id;

  // Ada on drums, Boma on keys.
  await run((tx) =>
    assign(tx, as(), {
      occurrenceId: service, teamId: worship, positionId: drums, personId: ids.Ada!,
    }),
  );
  await run((tx) =>
    assign(tx, as(), {
      occurrenceId: service, teamId: worship, positionId: keys, personId: ids.Boma!,
    }),
  );
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("the filter, on its own", () => {
  const note = (over: Partial<ItemNote>): ItemNote => ({
    id: "n", itemId: "i", body: "b",
    teamId: null, positionId: null, personId: null, audience: null,
    ...over,
  });

  const reader = { personId: "p1", teamIds: ["t1"], positionIds: ["pos1"] };

  it("gives everybody the notes addressed to nobody in particular", () => {
    expect(notesFor([note({})], reader)).toHaveLength(1);
  });

  it("gives a position note to whoever holds the position", () => {
    expect(notesFor([note({ positionId: "pos1" })], reader)).toHaveLength(1);
    expect(notesFor([note({ positionId: "pos2" })], reader)).toHaveLength(0);
  });

  it("gives a team note to the team", () => {
    expect(notesFor([note({ teamId: "t1" })], reader)).toHaveLength(1);
    expect(notesFor([note({ teamId: "t2" })], reader)).toHaveLength(0);
  });

  it("gives a personal note to one person", () => {
    expect(notesFor([note({ personId: "p1" })], reader)).toHaveLength(1);
    expect(notesFor([note({ personId: "p2", teamId: "t1" })], reader)).toHaveLength(0);
  });

  it("reads the narrowest target, so a personal note is not a team note", () => {
    const mixed = note({ personId: "p2", positionId: "pos1", teamId: "t1" });
    expect(notesFor([mixed], reader)).toHaveLength(0);
  });
});

describe("writing one", () => {
  it("refuses a blank", async () => {
    await expect(
      run((tx) => addItemNote(tx, as(), { itemId, body: "   " })),
    ).rejects.toThrow(InvalidInputError);
  });

  it("refuses a position the church does not have", async () => {
    await expect(
      run((tx) =>
        addItemNote(tx, as(), {
          itemId, body: "x", positionId: "00000000-0000-0000-0000-000000000000",
        }),
      ),
    ).rejects.toThrow(InvalidInputError);
  });

  it("carries its team along, so the drummer's note is also worship's", async () => {
    await run((tx) =>
      addItemNote(tx, as(), { itemId, body: "Come in on the second verse", positionId: drums }),
    );
    const [note] = (await notesOnItem()).filter((n) => n.positionId === drums);
    expect(note?.teamId).toBe(worship);
    expect(note?.audience).toBe("Drums");
  });

  it("names the person a personal note is for", async () => {
    await run((tx) =>
      addItemNote(tx, as(), { itemId, body: "Start us off", personId: ids.Boma! }),
    );
    const note = (await notesOnItem()).find((n) => n.personId === ids.Boma);
    expect(note?.audience).toContain("Boma");
  });

  it("hangs off the item, so the plan carries it", async () => {
    await run((tx) => addItemNote(tx, as(), { itemId, body: "Lights down" }));
    expect(await notesOnItem()).toHaveLength(3);
  });
});

describe("who reads what", () => {
  it("gives the drummer the drummer's note and not the keys player's", async () => {
    const notes = await notesOnItem();

    const ada = await run((tx) => readerFor(tx, { occurrenceId: service, personId: ids.Ada! }));
    const hers = notesFor(notes, ada).map((n) => n.body);
    expect(hers).toContain("Come in on the second verse");
    expect(hers).toContain("Lights down");
    expect(hers).not.toContain("Start us off");

    const boma = await run((tx) => readerFor(tx, { occurrenceId: service, personId: ids.Boma! }));
    const his = notesFor(notes, boma).map((n) => n.body);
    expect(his).toContain("Start us off");
    expect(his).not.toContain("Come in on the second verse");
  });

  it("follows the position, so swapping the drummer moves the note", async () => {
    const rows = await run((tx) => assignmentsForTeam(tx, worship, [service]));
    const hers = rows.find((r) => r.personId === ids.Ada && r.positionId === drums)!;
    await run((tx) => unassign(tx, as(), hers.id));
    await run((tx) =>
      assign(tx, as(), {
        occurrenceId: service, teamId: worship, positionId: drums, personId: ids.Boma!,
        anyway: true,
      }),
    );

    const notes = await notesOnItem();
    const boma = await run((tx) => readerFor(tx, { occurrenceId: service, personId: ids.Boma! }));
    expect(notesFor(notes, boma).map((n) => n.body)).toContain("Come in on the second verse");

    const ada = await run((tx) => readerFor(tx, { occurrenceId: service, personId: ids.Ada! }));
    expect(notesFor(notes, ada).map((n) => n.body)).not.toContain("Come in on the second verse");
  });
});

describe("who the plan can address", () => {
  it("is the positions and people the schedule actually holds", async () => {
    const found = await run((tx) => addressableFor(tx, service));
    expect(found.teams.map((t) => t.name)).toContain("Worship");
    expect(found.positions.map((p) => p.name)).toContain("Drums");
    expect(found.people.map((p) => p.name).some((n) => n.startsWith("Boma"))).toBe(true);
    expect(found.people.map((p) => p.name).some((n) => n.startsWith("Ada"))).toBe(false);
  });
});

describe("taking one off", () => {
  it("removes it from the plan", async () => {
    const before = await notesOnItem();
    await run((tx) => removeItemNote(tx, as(), before[0]!.id));
    expect(await notesOnItem()).toHaveLength(before.length - 1);
  });

  it("says so when it is already gone", async () => {
    await expect(
      run((tx) => removeItemNote(tx, as(), "00000000-0000-0000-0000-000000000000")),
    ).rejects.toThrow(InvalidInputError);
  });
});
