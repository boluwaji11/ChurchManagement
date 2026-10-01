/**
 * HRT-110. Saved lists (R1.14).
 *
 * The two kinds have to behave differently and the difference is the whole
 * point: a picked list stays exactly who was picked, and a rule list answers
 * itself. So these tests change the church underneath both and check that one
 * moved and the other did not.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  listSavedLists, createStaticList, createRuleList, renameList, setListArchived,
  addToList, removeFromList, resolveList, listsForPerson, cleanRule,
} from "../src/repo/lists";
import { createPerson, listPeople, updatePerson, getPersonForEdit } from "../src/repo/people";
import { PermissionError, type TenantRole } from "../src/roles";
import { InvalidInputError, NameTakenError } from "../src/errors";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let maria: string;
let carlos: string;
let dave: string;
const SLUG = "listtest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const make = (firstName: string, status: string) =>
  run((tx) =>
    createPerson(tx, as(), { firstName, lastName: "Listtest", lifecycleStatus: status } as never),
  ).then((p) => p.id);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "List Test Church");
  maria = await make("Maria", "member");
  carlos = await make("Carlos", "member");
  dave = await make("Dave", "visitor");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("the rule a list can hold", () => {
  it("keeps the filters the directory has and drops everything else", () => {
    expect(cleanRule({ status: "visitor", has: "noEmail", page: "3", evil: "1" })).toEqual({
      status: "visitor",
      has: "noEmail",
    });
  });

  it("drops a filter that was left empty", () => {
    expect(cleanRule({ q: "  ", status: "member" })).toEqual({ status: "member" });
  });
});

describe("a list somebody picked", () => {
  let id: string;

  it("holds exactly who was picked", async () => {
    const made = await run((tx) =>
      createStaticList(tx, as(), { name: "Calling this week", personIds: [maria, carlos] }),
    );
    id = made.id;
    expect(made.added).toBe(2);

    const resolved = await run((tx) => resolveList(tx, id));
    expect(resolved?.kind).toBe("static");
    expect(resolved?.ids).toHaveLength(2);
    expect(resolved?.ids).toContain(maria);
  });

  it("does not change when the church does", async () => {
    // Dave becomes a member. A picked list is not a question, so it does not
    // answer differently afterwards.
    const before = await run((tx) => getPersonForEdit(tx, dave));
    await run((tx) => updatePerson(tx, as(), dave, { ...before!, lifecycleStatus: "member" }));

    const resolved = await run((tx) => resolveList(tx, id));
    expect(resolved?.ids).not.toContain(dave);
  });

  it("ignores somebody already on it rather than failing", async () => {
    const added = await run((tx) => addToList(tx, as(), { listId: id, personIds: [maria, dave] }));
    expect(added).toBe(1);
  });

  it("takes somebody off without touching their record", async () => {
    const gone = await run((tx) => removeFromList(tx, as(), { listId: id, personIds: [dave] }));
    expect(gone).toBe(1);
    expect(await run((tx) => getPersonForEdit(tx, dave))).toBeTruthy();
  });

  it("shows on the records of the people on it", async () => {
    const on = await run((tx) => listsForPerson(tx, maria));
    expect(on.map((list) => list.name)).toContain("Calling this week");
  });

  it("counts the people on it", async () => {
    const all = await run((tx) => listSavedLists(tx));
    expect(all.find((list) => list.id === id)?.count).toBe(2);
  });
});

describe("a list that answers itself", () => {
  let id: string;

  it("is the directory's own filters, stored", async () => {
    const made = await run((tx) =>
      createRuleList(tx, as(), { name: "Visitors", rule: { status: "visitor" } }),
    );
    id = made.id;

    const resolved = await run((tx) => resolveList(tx, id));
    expect(resolved?.kind).toBe("rule");
    expect(resolved?.rule).toEqual({ status: "visitor" });
  });

  it("answers differently once the church changes", async () => {
    const first = await run((tx) => listPeople(tx, { status: "visitor" }));
    expect(first.map((p) => p.id)).not.toContain(dave);

    const before = await run((tx) => getPersonForEdit(tx, dave));
    await run((tx) => updatePerson(tx, as(), dave, { ...before!, lifecycleStatus: "visitor" }));

    const second = await run((tx) => listPeople(tx, { status: "visitor" }));
    expect(second.map((p) => p.id)).toContain(dave);
  });

  it("has no count of its own, because the answer is read when it is opened", async () => {
    const all = await run((tx) => listSavedLists(tx));
    expect(all.find((list) => list.id === id)?.count).toBeNull();
  });

  it("refuses people put on it by hand", async () => {
    await expect(run((tx) => addToList(tx, as(), { listId: id, personIds: [maria] })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses to be saved with no filters at all", async () => {
    await expect(run((tx) => createRuleList(tx, as(), { name: "Everyone", rule: {} })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("naming", () => {
  it("refuses a name another list already has, whatever the case", async () => {
    await expect(
      run((tx) => createStaticList(tx, as(), { name: "visitors", personIds: [] })),
    ).rejects.toBeInstanceOf(NameTakenError);
  });

  it("refuses an empty name", async () => {
    await expect(
      run((tx) => createStaticList(tx, as(), { name: "   ", personIds: [] })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("renames, and still refuses a name in use", async () => {
    const made = await run((tx) =>
      createStaticList(tx, as(), { name: "Temporary", personIds: [maria] }),
    );
    await run((tx) => renameList(tx, as(), { id: made.id, name: "New people" }));
    const all = await run((tx) => listSavedLists(tx));
    expect(all.find((list) => list.id === made.id)?.name).toBe("New people");

    await expect(
      run((tx) => renameList(tx, as(), { id: made.id, name: "Visitors" })),
    ).rejects.toBeInstanceOf(NameTakenError);
  });
});

describe("archiving", () => {
  it("takes the list off the screen and leaves everybody on it alone", async () => {
    const made = await run((tx) =>
      createStaticList(tx, as(), { name: "Old list", personIds: [maria, carlos] }),
    );
    await run((tx) => setListArchived(tx, as(), { id: made.id, archived: true }));

    const shown = await run((tx) => listSavedLists(tx));
    expect(shown.find((list) => list.id === made.id)).toBeUndefined();

    const withArchived = await run((tx) => listSavedLists(tx, { includeArchived: true }));
    expect(withArchived.find((list) => list.id === made.id)?.count).toBe(2);
    expect(await run((tx) => getPersonForEdit(tx, maria))).toBeTruthy();
  });

  it("comes back", async () => {
    const all = await run((tx) => listSavedLists(tx, { includeArchived: true }));
    const old = all.find((list) => list.name === "Old list")!;
    await run((tx) => setListArchived(tx, as(), { id: old.id, archived: false }));
    expect((await run((tx) => listSavedLists(tx))).find((l) => l.id === old.id)).toBeTruthy();
  });
});

describe("who may keep lists", () => {
  it("is refused to a role that does not edit people", async () => {
    await expect(
      run((tx) => createStaticList(tx, as("member"), { name: "Mine", personIds: [] }), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
    await expect(
      run(
        (tx) => createRuleList(tx, as("checkin_volunteer"), { name: "Theirs", rule: { status: "member" } }),
        "checkin_volunteer",
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
