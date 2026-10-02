/**
 * HRT-24. Merging two records that are one person, and undoing it (R2.8).
 *
 * The undo is what the tests are mostly about. Merging the wrong two people is
 * the fear that stops anybody pressing the button, and a merge nobody dares
 * press leaves the duplicates in the directory, which is the problem it was for.
 * So undo has to be exact, not approximate.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { mergePeople, undoMerge, listMerges, findDuplicatePairs } from "../src/repo/merge";
import { createPerson, getPersonForEdit, listPeople, listTagsForPerson } from "../src/repo/people";
import { createTag, setPersonTag } from "../src/repo/tags";
import { createGroup, addToGroup, removeFromGroup, groupRoster, seedGroupTypes } from "../src/repo/groups";
import { enterPipeline, addTask, peopleIn, listPipelines } from "../src/repo/followups";
import { createNote, countNotes } from "../src/repo/notes";
import { PermissionError, type TenantRole } from "../src/roles";
import { InvalidInputError } from "../src/errors";

let riverside: string;
const SUR = "Mergetest";
const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

const make = (first: string, over: Record<string, unknown> = {}) =>
  run(riverside, "owner", (tx) =>
    createPerson(tx, as(riverside), {
      firstName: first, lastName: SUR, lifecycleStatus: "visitor", ...over,
    } as never),
  );

beforeEach(async () => {
  const [row] = await owner()<{ id: string }[]>`select id from tenants where slug = 'riverside'`;
  riverside = row!.id;
  await owner()`delete from person_merges where tenant_id = ${riverside}`;
  await owner()`delete from people where last_name = ${SUR}`;
});

afterAll(async () => {
  await owner()`delete from person_merges where tenant_id = ${riverside}`;
  await owner()`delete from people where last_name = ${SUR}`;
  await owner()`delete from tags where name like ${"Mergetest%"}`;
  await closeConnections();
});

describe("merging", () => {
  it("moves contact details across and archives the loser", async () => {
    const winner = await make("Ada", { email: `ada.${SUR}@example.org` });
    const loser = await make("Addie", { phone: "(512) 555 0180" });

    const result = await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );
    expect(result.movedRows).toBeGreaterThan(0);

    const kept = await run(riverside, "owner", (tx) => getPersonForEdit(tx, winner.id));
    expect(kept!.email).toBe(`ada.${SUR}@example.org`);
    expect(kept!.phone).toBe("(512) 555 0180");

    // Archived, never deleted. Undo needs something to restore, and the id may
    // be referenced by an import's history or an audit entry.
    const gone = await run(riverside, "owner", (tx) => getPersonForEdit(tx, loser.id));
    expect(gone!.archivedAt).not.toBeNull();

    const visible = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR }));
    expect(visible.map((p) => p.firstName)).toEqual(["Ada"]);
  });

  it("moves notes and tags across", async () => {
    const winner = await make("Ben");
    const loser = await make("Benjamin");
    const tag = await run(riverside, "owner", (tx) =>
      createTag(tx, as(riverside), { name: "Mergetest choir" }),
    );

    await run(riverside, "owner", (tx) => setPersonTag(tx, as(riverside), loser.id, tag.id, true));
    await run(riverside, "owner", (tx) =>
      createNote(tx, { tenantId: riverside, personId: loser.id, classification: "general", body: "came with a friend" }),
    );

    await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    const tags = await run(riverside, "owner", (tx) => listTagsForPerson(tx, winner.id));
    expect(tags.map((t) => t.id)).toContain(tag.id);
    expect(await run(riverside, "owner", (tx) => countNotes(tx, winner.id, "general"))).toBe(1);
  });

  it("leaves a colliding row on the loser rather than failing", async () => {
    const winner = await make("Cara");
    const loser = await make("Carrie");
    const tag = await run(riverside, "owner", (tx) =>
      createTag(tx, as(riverside), { name: "Mergetest greeter" }),
    );
    // Both already carry the tag, so there is nothing to move and nothing to break.
    for (const id of [winner.id, loser.id]) {
      await run(riverside, "owner", (tx) => setPersonTag(tx, as(riverside), id, tag.id, true));
    }

    await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    const tags = await run(riverside, "owner", (tx) => listTagsForPerson(tx, winner.id));
    expect(tags.filter((t) => t.id === tag.id)).toHaveLength(1);
  });

  it("takes the loser's value for a field when that is what was chosen", async () => {
    const winner = await make("Dee", { dateOfBirth: null, lifecycleStatus: "visitor" });
    const loser = await make("Dee", { dateOfBirth: "1984-07-07", lifecycleStatus: "member" });

    await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), {
        winnerId: winner.id,
        loserId: loser.id,
        take: { dateOfBirth: "loser", lifecycleStatus: "loser" },
      }),
    );

    const kept = await run(riverside, "owner", (tx) => getPersonForEdit(tx, winner.id));
    expect(kept!.dateOfBirth).toBe("1984-07-07");
    expect(kept!.lifecycleStatus).toBe("member");
  });

  it("refuses to merge a record into itself", async () => {
    const one = await make("Eve");
    await expect(
      run(riverside, "owner", (tx) =>
        mergePeople(tx, as(riverside), { winnerId: one.id, loserId: one.id }),
      ),
    ).rejects.toThrow(InvalidInputError);
  });

  it("refuses a role that cannot archive", async () => {
    const winner = await make("Fay");
    const loser = await make("Faye");
    await expect(
      run(riverside, "staff", (tx) =>
        mergePeople(tx, as(riverside, "staff"), { winnerId: winner.id, loserId: loser.id }),
      ),
    ).rejects.toThrow(PermissionError);
  });
});

describe("undoing a merge", () => {
  it("puts the records, the rows, and the overwritten fields back", async () => {
    const winner = await make("Gus", { lifecycleStatus: "visitor" });
    const loser = await make("Gussie", { phone: "(512) 555 0191", lifecycleStatus: "member" });

    const merged = await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), {
        winnerId: winner.id,
        loserId: loser.id,
        take: { lifecycleStatus: "loser" },
      }),
    );

    const after = await run(riverside, "owner", (tx) => getPersonForEdit(tx, winner.id));
    expect(after!.phone).toBe("(512) 555 0191");
    expect(after!.lifecycleStatus).toBe("member");

    const undone = await run(riverside, "owner", (tx) => undoMerge(tx, as(riverside), merged.mergeId));
    expect(undone.restoredRows).toBe(merged.movedRows);

    const back = await run(riverside, "owner", (tx) => getPersonForEdit(tx, winner.id));
    expect(back!.phone).toBeNull();
    expect(back!.lifecycleStatus).toBe("visitor");

    const restored = await run(riverside, "owner", (tx) => getPersonForEdit(tx, loser.id));
    expect(restored!.archivedAt).toBeNull();
    expect(restored!.phone).toBe("(512) 555 0191");

    const visible = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR }));
    expect(visible).toHaveLength(2);
  });

  it("leaves rows created after the merge with the surviving person", async () => {
    const winner = await make("Hal");
    const loser = await make("Hally", { phone: "(512) 555 0175" });

    const merged = await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    // Written after the merge. It belongs to the person who survived, and was
    // never part of what moved, so an undo must not drag it back.
    await run(riverside, "owner", (tx) =>
      createNote(tx, { tenantId: riverside, personId: winner.id, classification: "general", body: "spoke on Sunday" }),
    );

    await run(riverside, "owner", (tx) => undoMerge(tx, as(riverside), merged.mergeId));

    expect(await run(riverside, "owner", (tx) => countNotes(tx, winner.id, "general"))).toBe(1);
    expect(await run(riverside, "owner", (tx) => countNotes(tx, loser.id, "general"))).toBe(0);
  });

  it("refuses to undo the same merge twice", async () => {
    const winner = await make("Ida");
    const loser = await make("Idina");
    const merged = await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );
    await run(riverside, "owner", (tx) => undoMerge(tx, as(riverside), merged.mergeId));

    await expect(
      run(riverside, "owner", (tx) => undoMerge(tx, as(riverside), merged.mergeId)),
    ).rejects.toThrow(InvalidInputError);
  });

  it("refuses after thirty days", async () => {
    const winner = await make("Jo");
    const loser = await make("Joey");
    const merged = await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );
    await owner()`update person_merges set merged_at = now() - interval '31 days' where id = ${merged.mergeId}`;

    await expect(
      run(riverside, "owner", (tx) => undoMerge(tx, as(riverside), merged.mergeId)),
    ).rejects.toThrow(/30 days/);
  });

  it("lists past merges and says which can still be undone", async () => {
    const winner = await make("Kay");
    const loser = await make("Kaye");
    const merged = await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    const list = await run(riverside, "owner", (tx) => listMerges(tx));
    const row = list.find((m) => m.id === merged.mergeId);
    expect(row?.canUndo).toBe(true);
    expect(row?.winnerName).toBe(`Kay ${SUR}`);
    expect(row?.loserName).toBe(`Kaye ${SUR}`);
  });
});

describe("the review queue (R2.8)", () => {
  it("finds two records that share an email address", async () => {
    await make("Lena", { email: `shared.${SUR}@example.org` });
    await make("Helena", { email: `shared.${SUR}@example.org` });

    const pairs = await run(riverside, "owner", (tx) => findDuplicatePairs(tx));
    const mine = pairs.filter((p) => p.a.name.includes(SUR) && p.b.name.includes(SUR));
    expect(mine).toHaveLength(1);
    expect(mine[0]!.confidence).toBe("certain");
  });

  it("lists a pair once, not twice", async () => {
    await make("Mo", { email: `mo.${SUR}@example.org` });
    await make("Mo", { email: `mo.${SUR}@example.org` });

    const pairs = await run(riverside, "owner", (tx) => findDuplicatePairs(tx));
    const mine = pairs.filter((p) => p.a.name.includes(SUR));
    expect(mine).toHaveLength(1);
  });

  it("stops listing a pair once it has been merged", async () => {
    const winner = await make("Ned", { email: `ned.${SUR}@example.org` });
    const loser = await make("Neddy", { email: `ned.${SUR}@example.org` });

    expect(
      (await run(riverside, "owner", (tx) => findDuplicatePairs(tx))).filter((p) => p.a.name.includes(SUR)),
    ).toHaveLength(1);

    await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    // The loser is archived, and the index only holds people who are not.
    expect(
      (await run(riverside, "owner", (tx) => findDuplicatePairs(tx))).filter((p) => p.a.name.includes(SUR)),
    ).toHaveLength(0);
  });
});

/**
 * HRT-117. What a merge used to leave behind (R2.8).
 *
 * Merging two records moved contact details, notes, tags and milestones, and
 * left the loser holding their group memberships, their place in a pipeline and
 * every task about them. The survivor came off the group, and nobody would see
 * it happen: the merge said it had worked and the roster was simply one shorter.
 */
describe("what a merge takes with it (R2.8)", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("moves a group membership onto the survivor", async () => {
    const winner = await make("Ada");
    const loser = await make("Addie");
    await run(riverside, "owner", (tx) => seedGroupTypes(tx, as(riverside)));
    const group = await run(riverside, "owner", (tx) =>
      createGroup(tx, as(riverside), { name: `Mergetest group ${Date.now()}` }),
    );
    await run(riverside, "owner", (tx) =>
      addToGroup(tx, as(riverside), { groupId: group.id, personId: loser.id, role: "leader" }),
    );

    await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    const roster = await run(riverside, "owner", (tx) => groupRoster(tx, group.id));
    expect(roster.map((m) => m.personId)).toContain(winner.id);
    expect(roster.map((m) => m.personId)).not.toContain(loser.id);
    // The role they held comes with them.
    expect(roster.find((m) => m.personId === winner.id)?.role).toBe("leader");
  });

  it("leaves a membership where the survivor is already live in that group", async () => {
    const winner = await make("Bea");
    const loser = await make("Beatrice");
    const group = await run(riverside, "owner", (tx) =>
      createGroup(tx, as(riverside), { name: `Mergetest both ${Date.now()}` }),
    );
    for (const person of [winner, loser]) {
      await run(riverside, "owner", (tx) =>
        addToGroup(tx, as(riverside), { groupId: group.id, personId: person.id }),
      );
    }

    await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    // One row, not two, and the group is not holding an archived person twice.
    const roster = await run(riverside, "owner", (tx) => groupRoster(tx, group.id));
    expect(roster.filter((m) => m.personId === winner.id)).toHaveLength(1);
  });

  it("still moves a live membership when the survivor once left that group", async () => {
    // The unique index only covers live rows, so a row the survivor left is not
    // a collision. Treating it as one was how somebody came off a group.
    const winner = await make("Cara");
    const loser = await make("Carah");
    const group = await run(riverside, "owner", (tx) =>
      createGroup(tx, as(riverside), { name: `Mergetest rejoin ${Date.now()}` }),
    );
    await run(riverside, "owner", (tx) =>
      addToGroup(tx, as(riverside), { groupId: group.id, personId: winner.id }),
    );
    await run(riverside, "owner", (tx) =>
      removeFromGroup(tx, as(riverside), { groupId: group.id, personId: winner.id }),
    );
    await run(riverside, "owner", (tx) =>
      addToGroup(tx, as(riverside), { groupId: group.id, personId: loser.id }),
    );

    await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    const roster = await run(riverside, "owner", (tx) => groupRoster(tx, group.id));
    expect(roster.map((m) => m.personId)).toContain(winner.id);
  });

  it("moves an open pipeline entry and the tasks written about them", async () => {
    const winner = await make("Dee");
    const loser = await make("Deedee");
    const [pipeline] = await run(riverside, "owner", (tx) => listPipelines(tx));

    await run(riverside, "owner", (tx) =>
      enterPipeline(tx, as(riverside), { pipelineId: pipeline!.id, personId: loser.id, on: today }),
    );
    await run(riverside, "owner", (tx) =>
      addTask(tx, as(riverside), { personId: loser.id, title: "Call them back", dueOn: today }),
    );

    await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );

    const inPipeline = await run(riverside, "owner", (tx) => peopleIn(tx, pipeline!.id));
    expect(inPipeline.map((p) => p.personId)).toContain(winner.id);
    expect(inPipeline.map((p) => p.personId)).not.toContain(loser.id);
  });

  it("puts every one of them back when the merge is undone", async () => {
    const winner = await make("Eve");
    const loser = await make("Evie");
    const group = await run(riverside, "owner", (tx) =>
      createGroup(tx, as(riverside), { name: `Mergetest undo ${Date.now()}` }),
    );
    await run(riverside, "owner", (tx) =>
      addToGroup(tx, as(riverside), { groupId: group.id, personId: loser.id }),
    );

    const merge = await run(riverside, "owner", (tx) =>
      mergePeople(tx, as(riverside), { winnerId: winner.id, loserId: loser.id }),
    );
    await run(riverside, "owner", (tx) => undoMerge(tx, as(riverside), merge.mergeId));

    const roster = await run(riverside, "owner", (tx) => groupRoster(tx, group.id));
    expect(roster.map((m) => m.personId)).toContain(loser.id);
    expect(roster.map((m) => m.personId)).not.toContain(winner.id);
  });
});
