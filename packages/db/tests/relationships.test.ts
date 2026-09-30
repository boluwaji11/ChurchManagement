/**
 * HRT-22. Relationships, independent of household (R2.4).
 *
 * The acceptance criterion for R2.4 is a safeguarding one: a do-not-contact
 * pair blocks either person from being the other's emergency contact. That is
 * checked here, in both orders, because the order a church enters things in is
 * whatever order the Sunday happened in.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { createPerson } from "../src/repo/people";
import {
  listRelationships, addRelationship, removeRelationship,
  doNotContactIds, isDoNotContact,
} from "../src/repo/relationships";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";

let riverside: string;
const SUR = "Reltest";

const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

const ids: Record<string, string> = {};

beforeAll(async () => {
  const rows = await owner()<{ id: string; slug: string }[]>`
    select id, slug from tenants where slug = 'riverside'`;
  riverside = rows[0]!.id;

  for (const first of ["Daniel", "Rachel", "Sophie", "Gregory"]) {
    const p = await run(riverside, "owner", (tx) =>
      createPerson(tx, as(riverside), {
        firstName: first, lastName: SUR, lifecycleStatus: "member",
      } as never),
    );
    ids[first] = p.id;
  }
});

afterAll(async () => {
  await owner()`delete from people where last_name = ${SUR}`;
  await closeConnections();
});

/** Clears every relationship between the test people, so each test starts level. */
const reset = () =>
  owner()`delete from relationships where person_id in (
    select id from people where last_name = ${SUR})`;

const kindsOn = async (personId: string) =>
  (await run(riverside, "owner", (tx) => listRelationships(tx, personId))).map(
    (r) => `${r.kind}:${r.relatedName}`,
  );

describe("both records agree", () => {
  it("writes the inverse for spouse, parent and child", async () => {
    await reset();
    await run(riverside, "owner", (tx) =>
      addRelationship(tx, as(riverside), {
        personId: ids["Daniel"]!, relatedPersonId: ids["Rachel"]!, kind: "spouse",
      }),
    );
    await run(riverside, "owner", (tx) =>
      addRelationship(tx, as(riverside), {
        personId: ids["Sophie"]!, relatedPersonId: ids["Daniel"]!, kind: "parent",
      }),
    );

    expect(await kindsOn(ids["Rachel"]!)).toEqual([`spouse:Daniel ${SUR}`]);
    // Daniel is Sophie's parent, so Sophie is Daniel's child.
    expect(await kindsOn(ids["Daniel"]!)).toContain(`child:Sophie ${SUR}`);
  });

  it("leaves guardian and emergency contact one-way", async () => {
    await reset();
    await run(riverside, "owner", (tx) =>
      addRelationship(tx, as(riverside), {
        personId: ids["Sophie"]!, relatedPersonId: ids["Gregory"]!, kind: "emergency_contact",
      }),
    );
    expect(await kindsOn(ids["Sophie"]!)).toEqual([`emergency_contact:Gregory ${SUR}`]);
    expect(await kindsOn(ids["Gregory"]!)).toEqual([]);
  });

  it("removes the inverse too", async () => {
    await reset();
    await run(riverside, "owner", (tx) =>
      addRelationship(tx, as(riverside), {
        personId: ids["Daniel"]!, relatedPersonId: ids["Rachel"]!, kind: "spouse",
      }),
    );
    const [rel] = await run(riverside, "owner", (tx) => listRelationships(tx, ids["Daniel"]!));
    await run(riverside, "owner", (tx) => removeRelationship(tx, as(riverside), rel!.id));

    expect(await kindsOn(ids["Daniel"]!)).toEqual([]);
    expect(await kindsOn(ids["Rachel"]!)).toEqual([]);
  });

  it("refuses a person related to themselves, and a duplicate", async () => {
    await reset();
    await expect(
      run(riverside, "owner", (tx) =>
        addRelationship(tx, as(riverside), {
          personId: ids["Daniel"]!, relatedPersonId: ids["Daniel"]!, kind: "spouse",
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidInputError);

    const add = () =>
      run(riverside, "owner", (tx) =>
        addRelationship(tx, as(riverside), {
          personId: ids["Daniel"]!, relatedPersonId: ids["Rachel"]!, kind: "spouse",
        }),
      );
    await add();
    await expect(add()).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("do not contact", () => {
  it("blocks an emergency contact in either order", async () => {
    await reset();
    await run(riverside, "owner", (tx) =>
      addRelationship(tx, as(riverside), {
        personId: ids["Sophie"]!, relatedPersonId: ids["Gregory"]!, kind: "do_not_contact",
      }),
    );

    for (const [a, b] of [["Sophie", "Gregory"], ["Gregory", "Sophie"]]) {
      await expect(
        run(riverside, "owner", (tx) =>
          addRelationship(tx, as(riverside), {
            personId: ids[a!]!, relatedPersonId: ids[b!]!, kind: "emergency_contact",
          }),
        ),
        `${a} to ${b}`,
      ).rejects.toBeInstanceOf(InvalidInputError);
    }
  });

  it("is mutual, and answers on both records", async () => {
    await reset();
    await run(riverside, "owner", (tx) =>
      addRelationship(tx, as(riverside), {
        personId: ids["Sophie"]!, relatedPersonId: ids["Gregory"]!, kind: "do_not_contact",
      }),
    );

    expect(await run(riverside, "owner", (tx) => doNotContactIds(tx, ids["Gregory"]!)))
      .toEqual([ids["Sophie"]]);
    expect(await run(riverside, "owner", (tx) =>
      isDoNotContact(tx, ids["Gregory"]!, ids["Sophie"]!))).toBe(true);
  });

  it("cancels a guardian record already on file rather than being refused", async () => {
    await reset();
    await run(riverside, "owner", (tx) =>
      addRelationship(tx, as(riverside), {
        personId: ids["Sophie"]!, relatedPersonId: ids["Gregory"]!, kind: "guardian",
      }),
    );

    const result = await run(riverside, "owner", (tx) =>
      addRelationship(tx, as(riverside), {
        personId: ids["Sophie"]!, relatedPersonId: ids["Gregory"]!, kind: "do_not_contact",
      }),
    );

    expect(result.cancelled).toBe(1);
    expect(await kindsOn(ids["Sophie"]!)).toEqual([`do_not_contact:Gregory ${SUR}`]);
  });

  it("can be recorded by staff, and lifted only by an admin", async () => {
    await reset();
    await run(riverside, "staff", (tx) =>
      addRelationship(tx, as(riverside, "staff"), {
        personId: ids["Sophie"]!, relatedPersonId: ids["Gregory"]!, kind: "do_not_contact",
      }),
    );

    const [order] = await run(riverside, "owner", (tx) => listRelationships(tx, ids["Sophie"]!));

    await expect(
      run(riverside, "staff", (tx) => removeRelationship(tx, as(riverside, "staff"), order!.id)),
    ).rejects.toBeInstanceOf(PermissionError);

    await run(riverside, "admin", (tx) => removeRelationship(tx, as(riverside, "admin"), order!.id));
    expect(await kindsOn(ids["Sophie"]!)).toEqual([]);
    expect(await kindsOn(ids["Gregory"]!)).toEqual([]);
  });
});

describe("permissions", () => {
  it("refuses a role that cannot edit people", async () => {
    await reset();
    await expect(
      run(riverside, "member", (tx) =>
        addRelationship(tx, as(riverside, "member"), {
          personId: ids["Daniel"]!, relatedPersonId: ids["Rachel"]!, kind: "spouse",
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
