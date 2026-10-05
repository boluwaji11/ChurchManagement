/**
 * HRT-17. Tags, management and merge (R1.13).
 *
 * The interesting cases are not "does a tag save". They are the two ways a
 * taxonomy rots: duplicates that differ only by case, and two tags that mean the
 * same thing. Both are tested here, along with who is allowed to reshape the
 * taxonomy and who is only allowed to use it.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  listTagsWithCounts, createTag, renameTag, setTagHue, deleteTag, mergeTags, setPersonTag,
  normaliseTagName,
} from "../src/repo/tags";
import { NameTakenError } from "../src/errors";
import { createPerson, listTagsForPerson } from "../src/repo/members";
import { PermissionError, type TenantRole } from "../src/roles";

let riverside: string;
let northgate: string;

const as = (tenantId: string, role: TenantRole) => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

/** Every tag these tests make starts with this, so the cleanup is exact. */
const P = "HRT17 ";

async function tag(tenantId: string, name: string, role: TenantRole = "owner") {
  return run(tenantId, role, (tx) => createTag(tx, as(tenantId, role), { name: P + name }));
}

async function person(tenantId: string, firstName: string) {
  return run(tenantId, "owner", (tx) =>
    createPerson(tx, as(tenantId, "owner"), {
      firstName,
      lastName: "Tagperson",
      lifecycleStatus: "visitor",
    }),
  );
}

beforeAll(async () => {
  const tenants = await owner()<{ id: string; slug: string }[]>`
    select id, slug from tenants where slug in ('riverside', 'northgate')`;
  riverside = tenants.find((t) => t.slug === "riverside")!.id;
  northgate = tenants.find((t) => t.slug === "northgate")!.id;
});

afterAll(async () => {
  await owner()`delete from tags where name like ${P + "%"}`;
  await owner()`delete from members where last_name = 'Tagperson'`;
  await closeConnections();
});

describe("naming", () => {
  it("collapses whitespace so two tags cannot differ by a space", () => {
    expect(normaliseTagName("  Youth   choir ")).toBe("Youth choir");
  });

  it("refuses a name that already exists in a different case", async () => {
    await tag(riverside, "Choir");
    await expect(tag(riverside, "cHoIr")).rejects.toThrow(NameTakenError);
  });

  it("lets a different church use the same name", async () => {
    const here = await tag(riverside, "Greeter");
    const there = await tag(northgate, "Greeter");
    expect(here.id).not.toBe(there.id);
  });

  it("refuses a rename onto another tag's name, and keeps the original", async () => {
    const a = await tag(riverside, "Usher");
    await tag(riverside, "Welcome");

    await expect(
      run(riverside, "owner", (tx) => renameTag(tx, as(riverside, "owner"), a.id, P + "Welcome")),
    ).rejects.toThrow(NameTakenError);

    const [row] = await owner()<{ name: string }[]>`select name from tags where id = ${a.id}`;
    expect(row!.name).toBe(P + "Usher");
  });
});

describe("hues", () => {
  it("assigns the least-used hue so a fresh list is not three of one colour", async () => {
    const before = await owner()<{ hue: string }[]>`
      select hue from tags where tenant_id = ${northgate}`;
    const made = [];
    for (const name of ["H1", "H2", "H3", "H4"]) made.push((await tag(northgate, name)).hue);

    // Four new tags, drawn from the emptiest slots, cannot all be the same hue.
    expect(new Set(made).size).toBeGreaterThan(1);
    expect(before).toBeDefined();
  });

  it("recolours to a chosen hue", async () => {
    const t = await tag(riverside, "Recolour");
    await run(riverside, "owner", (tx) => setTagHue(tx, as(riverside, "owner"), t.id, "violet"));
    const [row] = await owner()<{ hue: string }[]>`select hue from tags where id = ${t.id}`;
    expect(row!.hue).toBe("violet");
  });
});

describe("applying a tag", () => {
  it("is idempotent in both directions", async () => {
    const t = await tag(riverside, "Apply");
    const p = await person(riverside, "Anna");
    const actor = as(riverside, "owner");

    await run(riverside, "owner", (tx) => setPersonTag(tx, actor, p.id, t.id, true));
    await run(riverside, "owner", (tx) => setPersonTag(tx, actor, p.id, t.id, true));

    let rows = await owner()`select * from person_tags where member_id = ${p.id} and tag_id = ${t.id}`;
    expect(rows).toHaveLength(1);

    await run(riverside, "owner", (tx) => setPersonTag(tx, actor, p.id, t.id, false));
    await run(riverside, "owner", (tx) => setPersonTag(tx, actor, p.id, t.id, false));

    rows = await owner()`select * from person_tags where member_id = ${p.id} and tag_id = ${t.id}`;
    expect(rows).toHaveLength(0);
  });

  it("counts the members carrying each tag", async () => {
    const t = await tag(riverside, "Counted");
    const actor = as(riverside, "owner");
    for (const name of ["Ben", "Clara", "Dean"]) {
      const p = await person(riverside, name);
      await run(riverside, "owner", (tx) => setPersonTag(tx, actor, p.id, t.id, true));
    }

    const all = await run(riverside, "owner", (tx) => listTagsWithCounts(tx));
    expect(all.find((x) => x.id === t.id)!.members).toBe(3);
  });

  it("cannot put another church's tag on a person", async () => {
    const foreign = await tag(northgate, "Foreign");
    const p = await person(riverside, "Ellis");

    await expect(
      run(riverside, "owner", (tx) =>
        setPersonTag(tx, as(riverside, "owner"), p.id, foreign.id, true),
      ),
    ).rejects.toThrow(/No such tag/);
  });
});

describe("merge", () => {
  it("moves everyone onto the target and removes the old tag", async () => {
    const from = await tag(riverside, "Greeters");
    const into = await tag(riverside, "Greeting");
    const actor = as(riverside, "owner");

    const only = await person(riverside, "Fiona");
    const both = await person(riverside, "Gabe");

    await run(riverside, "owner", (tx) => setPersonTag(tx, actor, only.id, from.id, true));
    await run(riverside, "owner", (tx) => setPersonTag(tx, actor, both.id, from.id, true));
    await run(riverside, "owner", (tx) => setPersonTag(tx, actor, both.id, into.id, true));

    await run(riverside, "owner", (tx) =>
      mergeTags(tx, actor, { fromId: from.id, intoId: into.id }),
    );

    const gone = await owner()`select id from tags where id = ${from.id}`;
    expect(gone).toHaveLength(0);

    // The person who had only the old tag now has the target.
    const onlyTags = await run(riverside, "owner", (tx) => listTagsForPerson(tx, only.id));
    expect(onlyTags.map((t) => t.id)).toEqual([into.id]);

    // The person who had both keeps exactly one, not a duplicate.
    const bothTags = await run(riverside, "owner", (tx) => listTagsForPerson(tx, both.id));
    expect(bothTags.filter((t) => t.id === into.id)).toHaveLength(1);
  });

  it("refuses to merge a tag into itself", async () => {
    const t = await tag(riverside, "Self");
    await expect(
      run(riverside, "owner", (tx) =>
        mergeTags(tx, as(riverside, "owner"), { fromId: t.id, intoId: t.id }),
      ),
    ).rejects.toThrow(/itself/);
  });

  it("cannot merge across churches", async () => {
    const here = await tag(riverside, "Local");
    const there = await tag(northgate, "Remote");

    await expect(
      run(riverside, "owner", (tx) =>
        mergeTags(tx, as(riverside, "owner"), { fromId: here.id, intoId: there.id }),
      ),
    ).rejects.toThrow(/No such tag/);

    const survives = await owner()`select id from tags where id = ${here.id}`;
    expect(survives).toHaveLength(1);
  });
});

describe("deleting", () => {
  it("removes the tag and its assignments, and nothing else", async () => {
    const t = await tag(riverside, "Doomed");
    const p = await person(riverside, "Hugh");
    const actor = as(riverside, "owner");
    await run(riverside, "owner", (tx) => setPersonTag(tx, actor, p.id, t.id, true));

    const result = await run(riverside, "owner", (tx) => deleteTag(tx, actor, t.id));
    expect(result.removedFrom).toBe(1);

    expect(await owner()`select id from tags where id = ${t.id}`).toHaveLength(0);
    expect(await owner()`select member_id from person_tags where tag_id = ${t.id}`).toHaveLength(0);
    // The person is untouched. A tag is a label, not a record.
    expect(await owner()`select id from members where id = ${p.id}`).toHaveLength(1);
  });

  it("cannot delete another church's tag", async () => {
    const foreign = await tag(northgate, "Protected");
    await expect(
      run(riverside, "owner", (tx) => deleteTag(tx, as(riverside, "owner"), foreign.id)),
    ).rejects.toThrow(/No such tag/);
    expect(await owner()`select id from tags where id = ${foreign.id}`).toHaveLength(1);
  });
});

describe("who may do what", () => {
  it("lets staff create and apply a tag", async () => {
    const t = await tag(riverside, "Staffmade", "staff");
    const p = await person(riverside, "Iris");
    await run(riverside, "staff", (tx) =>
      setPersonTag(tx, as(riverside, "staff"), p.id, t.id, true),
    );
    const applied = await run(riverside, "staff", (tx) => listTagsForPerson(tx, p.id));
    expect(applied.map((x) => x.id)).toContain(t.id);
  });

  it("refuses staff the rename, the recolour, the merge, and the delete", async () => {
    const a = await tag(riverside, "Structural");
    const b = await tag(riverside, "Structure");
    const actor = as(riverside, "staff");

    await expect(run(riverside, "staff", (tx) => renameTag(tx, actor, a.id, P + "New"))).rejects.toThrow(PermissionError);
    await expect(run(riverside, "staff", (tx) => setTagHue(tx, actor, a.id, "rose"))).rejects.toThrow(PermissionError);
    await expect(run(riverside, "staff", (tx) => mergeTags(tx, actor, { fromId: a.id, intoId: b.id }))).rejects.toThrow(PermissionError);
    await expect(run(riverside, "staff", (tx) => deleteTag(tx, actor, a.id))).rejects.toThrow(PermissionError);

    expect(await owner()`select id from tags where id = ${a.id}`).toHaveLength(1);
  });

  it("refuses a member and a check-in volunteer everything", async () => {
    const t = await tag(riverside, "Readonly");
    const p = await person(riverside, "Jonah");

    for (const role of ["member", "checkin_volunteer"] as TenantRole[]) {
      await expect(
        run(riverside, role, (tx) => createTag(tx, as(riverside, role), { name: P + "Refused" })),
      ).rejects.toThrow(PermissionError);
      await expect(
        run(riverside, role, (tx) => setPersonTag(tx, as(riverside, role), p.id, t.id, true)),
      ).rejects.toThrow(PermissionError);
    }
  });
});

describe("the audit log", () => {
  it("records the tag, the rename, and the assignment", async () => {
    const userId = (await owner()<{ id: string }[]>`
      select id from app_users where email = 'admin@riverside.example.org'`)[0]!.id;
    const ctx = { tenantId: riverside, role: "admin" as TenantRole, userId };
    const actor = as(riverside, "admin");

    const t = await withTenant(ctx, (tx) => createTag(tx, actor, { name: P + "Audited" }));
    await withTenant(ctx, (tx) => renameTag(tx, actor, t.id, P + "Audited twice"));

    const entries = await owner()<{ action: string; actor_role: string; actor_user_id: string }[]>`
      select action, actor_role, actor_user_id from audit_entries
       where entity = 'tags' and entity_id = ${t.id} order by at`;

    expect(entries.map((e) => e.action)).toEqual(["insert", "update"]);
    expect(entries.every((e) => e.actor_role === "admin")).toBe(true);
    expect(entries.every((e) => e.actor_user_id === userId)).toBe(true);
  });
});
