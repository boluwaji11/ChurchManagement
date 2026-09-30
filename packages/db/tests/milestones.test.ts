/**
 * HRT-23. Milestones (R2.6).
 *
 * Two of these also live as columns on the person, because the directory reads
 * them on every page. The tests that matter are the ones checking the two stay
 * in step, and that recording a milestone never overwrites a correction someone
 * made on the record itself.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { createPerson, getPerson } from "../src/repo/people";
import { listMilestones, addMilestone, removeMilestone, listMilestonesByKind } from "../src/repo/milestones";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";

let riverside: string;
const SUR = "Milestonetest";

const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

const make = async (first: string, over: Record<string, unknown> = {}) => {
  const p = await run(riverside, "owner", (tx) =>
    createPerson(tx, as(riverside), {
      firstName: first, lastName: SUR, lifecycleStatus: "member", ...over,
    } as never),
  );
  return p.id;
};

beforeAll(async () => {
  const rows = await owner()<{ id: string }[]>`select id from tenants where slug = 'riverside'`;
  riverside = rows[0]!.id;
});

afterAll(async () => {
  await owner()`delete from people where last_name = ${SUR}`;
  await closeConnections();
});

describe("recording", () => {
  it("lists most recent first", async () => {
    const id = await make("Nathan");
    for (const [kind, on] of [
      ["salvation", "2019-04-21"],
      ["baptism", "2019-06-02"],
      ["membership_class", "2020-01-12"],
    ] as const) {
      await run(riverside, "owner", (tx) =>
        addMilestone(tx, as(riverside), { personId: id, kind, occurredOn: on }),
      );
    }

    const rows = await run(riverside, "owner", (tx) => listMilestones(tx, id));
    expect(rows.map((r) => r.kind)).toEqual(["membership_class", "baptism", "salvation"]);
  });

  it("refuses a date in the future, and a date that is not one", async () => {
    const id = await make("Olivia");
    const year = new Date().getFullYear() + 1;

    for (const on of [`${year}-01-01`, "not a date"]) {
      await expect(
        run(riverside, "owner", (tx) =>
          addMilestone(tx, as(riverside), { personId: id, kind: "baptism", occurredOn: on }),
        ),
        on,
      ).rejects.toBeInstanceOf(InvalidInputError);
    }
  });

  it("removes one and leaves the rest", async () => {
    const id = await make("Peter");
    await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), { personId: id, kind: "baptism", occurredOn: "2021-03-07" }),
    );
    await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), { personId: id, kind: "salvation", occurredOn: "2021-02-14" }),
    );

    const [first] = await run(riverside, "owner", (tx) => listMilestones(tx, id));
    await run(riverside, "owner", (tx) => removeMilestone(tx, as(riverside), first!.id));

    const left = await run(riverside, "owner", (tx) => listMilestones(tx, id));
    expect(left.map((r) => r.kind)).toEqual(["salvation"]);
  });
});

describe("the person record keeps up", () => {
  it("a death sets the status to deceased", async () => {
    const id = await make("Walter");
    const result = await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), { personId: id, kind: "death", occurredOn: "2024-11-02" }),
    );

    expect(result.updatedPerson).toBe(true);
    const person = await run(riverside, "owner", (tx) => getPerson(tx, id));
    expect(person?.lifecycleStatus).toBe("deceased");
  });

  it("removing the death record leaves the status alone", async () => {
    const id = await make("Frances");
    const m = await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), { personId: id, kind: "death", occurredOn: "2024-11-02" }),
    );
    await run(riverside, "owner", (tx) => removeMilestone(tx, as(riverside), m.id));

    const person = await run(riverside, "owner", (tx) => getPerson(tx, id));
    expect(person?.lifecycleStatus).toBe("deceased");
  });

  it("a first visit fills a blank date and leaves a corrected one alone", async () => {
    const blank = await make("Louise");
    await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), {
        personId: blank, kind: "first_visit", occurredOn: "2023-09-10",
      }),
    );
    expect((await run(riverside, "owner", (tx) => getPerson(tx, blank)))?.firstVisitOn)
      .toBe("2023-09-10");

    const corrected = await make("Harold", { firstVisitOn: "2022-01-09" });
    const result = await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), {
        personId: corrected, kind: "first_visit", occurredOn: "2023-09-10",
      }),
    );

    expect(result.updatedPerson).toBe(false);
    expect((await run(riverside, "owner", (tx) => getPerson(tx, corrected)))?.firstVisitOn)
      .toBe("2022-01-09");
  });
});

describe("reporting", () => {
  it("finds everyone who reached a milestone in a window, both ends included", async () => {
    const a = await make("Ruth");
    const b = await make("Silas");
    const c = await make("Tabitha");

    await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), { personId: a, kind: "baptism", occurredOn: "2025-01-01" }),
    );
    await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), { personId: b, kind: "baptism", occurredOn: "2025-12-31" }),
    );
    await run(riverside, "owner", (tx) =>
      addMilestone(tx, as(riverside), { personId: c, kind: "baptism", occurredOn: "2024-12-31" }),
    );

    const rows = await run(riverside, "owner", (tx) =>
      listMilestonesByKind(tx, "baptism", "2025-01-01", "2025-12-31"),
    );
    const mine = rows.filter((r) => r.personName.endsWith(SUR)).map((r) => r.personName);
    expect(mine).toEqual([`Silas ${SUR}`, `Ruth ${SUR}`]);
  });
});

describe("permissions", () => {
  it("refuses a role that cannot edit people", async () => {
    const id = await make("Vernon");
    await expect(
      run(riverside, "member", (tx) =>
        addMilestone(tx, as(riverside, "member"), {
          personId: id, kind: "baptism", occurredOn: "2020-05-05",
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
