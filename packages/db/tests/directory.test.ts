/**
 * HRT-40 and HRT-41. Finding members, and acting on a selection (R2.12).
 *
 * Searching and filtering happen in Postgres rather than in the page, so the
 * answer is the same at fifty members and at five thousand, and so a filtered
 * export exports what the filter says rather than what one page of it said.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { listPeople, countPeople, createPerson, bulkSetArchived, bulkSetStatus } from "../src/repo/members";
import { createTag, bulkSetPersonTag, setPersonTag } from "../src/repo/tags";
import { listTagsForPerson } from "../src/repo/members";
import { PermissionError, type TenantRole } from "../src/roles";

let riverside: string;
let northgate: string;
const SUR = "Directorytest";

const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

const ids: Record<string, string> = {};

beforeAll(async () => {
  const rows = await owner()<{ id: string; slug: string }[]>`
    select id, slug from tenants where slug in ('riverside', 'northgate')`;
  riverside = rows.find((t) => t.slug === "riverside")!.id;
  northgate = rows.find((t) => t.slug === "northgate")!.id;

  const make = async (first: string, over: Record<string, unknown> = {}) => {
    const p = await run(riverside, "owner", (tx) =>
      createPerson(tx, as(riverside), {
        firstName: first,
        lastName: SUR,
        lifecycleStatus: "visitor",
        ...over,
      } as never),
    );
    ids[first] = p.id;
    return p.id;
  };

  await make("Amos", { email: `amos.${SUR}@example.org`, lifecycleStatus: "member" });
  await make("Bea", { phone: "(512) 555 7431" });
  await make("Cyrus", { lifecycleStatus: "inactive" });
  await make("Delia", { email: `delia.${SUR}@example.org`, phone: "(737) 555 0002", lifecycleStatus: "member" });
});

afterAll(async () => {
  await owner()`delete from members where last_name = ${SUR}`;
  await owner()`delete from tags where name like ${"Directorytest%"}`;
  await closeConnections();
});

const mine = (rows: { lastName: string; firstName: string }[]) =>
  rows.filter((r) => r.lastName === SUR).map((r) => r.firstName);

describe("searching", () => {
  it("finds by first name, surname, and the two together", async () => {
    for (const q of ["amos", "Directorytest", "amos directorytest"]) {
      const rows = await run(riverside, "owner", (tx) => listPeople(tx, { q }));
      expect(mine(rows), q).toContain("Amos");
    }
  });

  it("finds by email address", async () => {
    const rows = await run(riverside, "owner", (tx) => listPeople(tx, { q: "delia.Directorytest@" }));
    expect(mine(rows)).toEqual(["Delia"]);
  });

  it("finds a phone number typed without its punctuation", async () => {
    // The directory holds "(512) 555 7431". Nobody types it that way.
    const rows = await run(riverside, "owner", (tx) => listPeople(tx, { q: "5557431" }));
    expect(mine(rows)).toEqual(["Bea"]);
  });

  it("ignores case", async () => {
    const rows = await run(riverside, "owner", (tx) => listPeople(tx, { q: "CYRUS" }));
    expect(mine(rows)).toEqual(["Cyrus"]);
  });

  it("returns nothing for a search that matches nothing", async () => {
    const rows = await run(riverside, "owner", (tx) => listPeople(tx, { q: "zzzznobody" }));
    expect(rows).toEqual([]);
  });

  it("cannot reach another church, whatever is typed", async () => {
    const rows = await run(northgate, "owner", (tx) => listPeople(tx, { q: "Directorytest" }));
    expect(rows).toEqual([]);
  });
});

describe("filtering", () => {
  it("filters by status", async () => {
    const rows = await run(riverside, "owner", (tx) => listPeople(tx, { status: "member" }));
    expect(mine(rows).sort()).toEqual(["Amos", "Delia"]);
  });

  it("filters by whether there is an email or a phone", async () => {
    const withEmail = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR, has: "email" }));
    expect(mine(withEmail).sort()).toEqual(["Amos", "Delia"]);

    const without = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR, has: "noEmail" }));
    expect(mine(without).sort()).toEqual(["Bea", "Cyrus"]);

    const withPhone = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR, has: "phone" }));
    expect(mine(withPhone).sort()).toEqual(["Bea", "Delia"]);
  });

  it("filters by tag", async () => {
    const tag = await run(riverside, "owner", (tx) =>
      createTag(tx, as(riverside), { name: "Directorytest choir" }),
    );
    await run(riverside, "owner", (tx) => setPersonTag(tx, as(riverside), ids["Amos"]!, tag.id, true));

    const rows = await run(riverside, "owner", (tx) => listPeople(tx, { tagId: tag.id }));
    expect(mine(rows)).toEqual(["Amos"]);
  });

  it("combines a search with a filter", async () => {
    const rows = await run(riverside, "owner", (tx) =>
      listPeople(tx, { q: SUR, status: "member", has: "phone" }),
    );
    expect(mine(rows)).toEqual(["Delia"]);
  });
});

describe("ordering", () => {
  it("orders by first name, ascending and descending", async () => {
    const up = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR, sort: "firstName" }));
    expect(mine(up)).toEqual(["Amos", "Bea", "Cyrus", "Delia"]);

    const down = await run(riverside, "owner", (tx) =>
      listPeople(tx, { q: SUR, sort: "firstName", dir: "desc" }),
    );
    expect(mine(down)).toEqual(["Delia", "Cyrus", "Bea", "Amos"]);
  });

  it("falls back to surname order when asked for something it does not know", async () => {
    const rows = await run(riverside, "owner", (tx) =>
      listPeople(tx, { q: SUR, sort: "nonsense" as never }),
    );
    expect(mine(rows)).toHaveLength(4);
  });
});

describe("acting on a selection (R2.12)", () => {
  it("archives and restores several at once, and reports what it changed", async () => {
    const chosen = [ids["Bea"]!, ids["Cyrus"]!];
    const archived = await run(riverside, "owner", (tx) =>
      bulkSetArchived(tx, as(riverside), chosen, true),
    );
    expect(archived).toBe(2);

    const visible = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR }));
    expect(mine(visible).sort()).toEqual(["Amos", "Delia"]);

    await run(riverside, "owner", (tx) => bulkSetArchived(tx, as(riverside), chosen, false));
    const back = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR }));
    expect(mine(back)).toHaveLength(4);
  });

  it("sets a status across a selection", async () => {
    const changed = await run(riverside, "owner", (tx) =>
      bulkSetStatus(tx, as(riverside), [ids["Bea"]!, ids["Cyrus"]!], "regular_attender"),
    );
    expect(changed).toBe(2);

    const rows = await run(riverside, "owner", (tx) =>
      listPeople(tx, { q: SUR, status: "regular_attender" }),
    );
    expect(mine(rows).sort()).toEqual(["Bea", "Cyrus"]);
  });

  it("tags a selection, skipping anyone who already has it", async () => {
    const tag = await run(riverside, "owner", (tx) =>
      createTag(tx, as(riverside), { name: "Directorytest greeter" }),
    );
    await run(riverside, "owner", (tx) => setPersonTag(tx, as(riverside), ids["Amos"]!, tag.id, true));

    const applied = await run(riverside, "owner", (tx) =>
      bulkSetPersonTag(tx, as(riverside), [ids["Amos"]!, ids["Bea"]!, ids["Delia"]!], tag.id, true),
    );
    // Amos already had it, so two were applied rather than three failing.
    expect(applied).toBe(2);

    const onBea = await run(riverside, "owner", (tx) => listTagsForPerson(tx, ids["Bea"]!));
    expect(onBea.map((t) => t.id)).toContain(tag.id);

    const removed = await run(riverside, "owner", (tx) =>
      bulkSetPersonTag(tx, as(riverside), [ids["Amos"]!, ids["Bea"]!], tag.id, false),
    );
    expect(removed).toBe(2);
  });

  it("reports the truth when ids belong to another church", async () => {
    const [foreign] = await owner()<{ id: string; lifecycle_status: string; updated_at: Date }[]>`
      select id, lifecycle_status, updated_at from members where tenant_id = ${northgate} limit 1`;

    const changed = await run(riverside, "owner", (tx) =>
      bulkSetStatus(tx, as(riverside), [ids["Amos"]!, foreign!.id], "deceased"),
    );
    // One, not two. The other church's person was never reachable.
    expect(changed).toBe(1);

    const [after] = await owner()<{ lifecycle_status: string; updated_at: Date }[]>`
      select lifecycle_status, updated_at from members where id = ${foreign!.id}`;
    expect(after!.lifecycle_status).toBe(foreign!.lifecycle_status);
    expect(after!.updated_at.getTime()).toBe(foreign!.updated_at.getTime());
  });

  it("refuses staff the bulk archive and a member everything", async () => {
    await expect(
      run(riverside, "staff", (tx) => bulkSetArchived(tx, as(riverside, "staff"), [ids["Amos"]!], true)),
    ).rejects.toThrow(PermissionError);

    await expect(
      run(riverside, "member", (tx) => bulkSetStatus(tx, as(riverside, "member"), [ids["Amos"]!], "member")),
    ).rejects.toThrow(PermissionError);
  });

  it("does nothing, safely, when nothing is selected", async () => {
    expect(await run(riverside, "owner", (tx) => bulkSetArchived(tx, as(riverside), [], true))).toBe(0);
    expect(await run(riverside, "owner", (tx) => bulkSetStatus(tx, as(riverside), [], "member"))).toBe(0);
  });
});

describe("pages", () => {
  beforeAll(async () => {
    // Enough to need more than one page of fifty.
    for (let i = 0; i < 12; i++) {
      await run(riverside, "owner", (tx) =>
        createPerson(tx, as(riverside), {
          firstName: `Page${String(i).padStart(2, "0")}`,
          lastName: SUR,
          lifecycleStatus: "visitor",
        }),
      );
    }
  });

  it("returns a page, and counts everything matching", async () => {
    const opts = { q: SUR, sort: "firstName" as const, perPage: 5 };
    const first = await run(riverside, "owner", (tx) => listPeople(tx, { ...opts, page: 1 }));
    const second = await run(riverside, "owner", (tx) => listPeople(tx, { ...opts, page: 2 }));
    const matching = await run(riverside, "owner", (tx) => countPeople(tx, { q: SUR }));

    expect(first).toHaveLength(5);
    expect(second).toHaveLength(5);
    // No row appears on two pages, which an unstable sort would cause.
    expect(first.map((p) => p.id).some((id) => second.map((p) => p.id).includes(id))).toBe(false);
    expect(matching).toBeGreaterThan(10);
  });

  it("counts what the filter matches, not what the page shows", async () => {
    const all = await run(riverside, "owner", (tx) => countPeople(tx, { q: SUR }));
    const page = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR, page: 1, perPage: 3 }));
    expect(page).toHaveLength(3);
    expect(all).toBeGreaterThan(3);
  });

  it("returns everything when no page is asked for, which is what an export wants", async () => {
    const everything = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR }));
    const matching = await run(riverside, "owner", (tx) => countPeople(tx, { q: SUR }));
    expect(everything).toHaveLength(matching);
  });

  it("gives an empty page past the end rather than an error", async () => {
    const rows = await run(riverside, "owner", (tx) => listPeople(tx, { q: SUR, page: 99, perPage: 5 }));
    expect(rows).toEqual([]);
  });
});
