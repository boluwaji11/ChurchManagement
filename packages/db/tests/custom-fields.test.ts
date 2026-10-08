/**
 * HRT-16. Custom fields (R1.12).
 *
 * The risk in a field builder is not that a value fails to save. It is that a
 * field defined by one church becomes writable by another, that a value is
 * stored in a shape nothing can read back, or that a form which renders half the
 * fields quietly erases the other half. Those are the tests.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  listCustomFields, createCustomField, updateCustomField, deleteCustomField,
  getCustomValues, setCustomValues, coerceCustomValue, keyFor,
  type CustomFieldType,
} from "../src/repo/custom-fields";
import { createPerson } from "../src/repo/members";
import { PermissionError, type TenantRole } from "../src/roles";
import { InvalidInputError, NameTakenError } from "../src/errors";

let riverside: string;
let northgate: string;

const P = "HRT16 ";
const as = (tenantId: string, role: TenantRole) => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

async function define(
  tenantId: string,
  label: string,
  type: CustomFieldType,
  options?: string[],
  role: TenantRole = "owner",
) {
  return run(tenantId, role, (tx) =>
    createCustomField(tx, as(tenantId, role), { entity: "person", label: P + label, type, options }),
  );
}

async function person(tenantId: string, firstName: string) {
  return run(tenantId, "owner", (tx) =>
    createPerson(tx, as(tenantId, "owner"), { firstName, lastName: "Fieldperson", lifecycleStatus: "visitor" }),
  );
}

beforeAll(async () => {
  const tenants = await owner()<{ id: string; slug: string }[]>`
    select id, slug from tenants where slug in ('riverside', 'northgate')`;
  riverside = tenants.find((t) => t.slug === "riverside")!.id;
  northgate = tenants.find((t) => t.slug === "northgate")!.id;
});

afterAll(async () => {
  await owner()`delete from custom_fields where label like ${P + "%"}`;
  await owner()`delete from members where last_name = 'Fieldperson'`;
  await closeConnections();
});

describe("defining a field", () => {
  it("derives a stable key from the label", () => {
    expect(keyFor("Dietary notes")).toBe("dietary_notes");
    expect(keyFor("Parking permit #")).toBe("parking_permit");
    expect(keyFor("!!!")).toBe("field");
  });

  it("keeps keys unique even when two labels reduce to the same one", async () => {
    const a = await define(riverside, "Usual service", "text");
    const b = await define(riverside, "Usual  service!", "text");
    expect(a.key).not.toBe(b.key);
    expect(b.key).toMatch(/_2$/);
  });

  it("refuses a duplicate label in the same case-insensitive form", async () => {
    await define(riverside, "Allergy", "text");
    await expect(define(riverside, "allergy", "text")).rejects.toThrow(NameTakenError);
  });

  it("refuses a choice field with no choices", async () => {
    await expect(define(riverside, "Empty choices", "select", [])).rejects.toThrow(InvalidInputError);
  });

  it("drops blank and duplicate choices", async () => {
    const f = await define(riverside, "Shirt", "select", ["Small", " Small ", "", "Large"]);
    expect(f.options).toEqual(["Small", "Large"]);
  });

  it("stores no choices on a type that cannot have them", async () => {
    const f = await define(riverside, "Plain", "text", ["ignored"]);
    expect(f.options).toBeNull();
  });
});

describe("values", () => {
  it("round-trips every type in the shape it was given", async () => {
    const p = await person(riverside, "Val");
    const text = await define(riverside, "Notes", "text");
    const num = await define(riverside, "Seats", "number");
    const date = await define(riverside, "Joined on", "date");
    const bool = await define(riverside, "Drives", "boolean");
    const one = await define(riverside, "Service", "select", ["Morning", "Evening"]);
    const many = await define(riverside, "Diet", "multi_select", ["Vegetarian", "Gluten free"]);

    await run(riverside, "owner", (tx) =>
      setCustomValues(tx, as(riverside, "owner"), "person", p.id, {
        [text.id]: "Sits near the back",
        [num.id]: 4,
        [date.id]: "2024-05-01",
        [bool.id]: true,
        [one.id]: "Evening",
        [many.id]: ["Vegetarian", "Gluten free"],
      }),
    );

    const saved = await run(riverside, "owner", (tx) => getCustomValues(tx, "person", p.id));
    expect(saved[text.id]).toBe("Sits near the back");
    expect(saved[num.id]).toBe(4);
    expect(saved[date.id]).toBe("2024-05-01");
    expect(saved[bool.id]).toBe(true);
    expect(saved[one.id]).toBe("Evening");
    expect(saved[many.id]).toEqual(["Vegetarian", "Gluten free"]);
  });

  it("clears a field by removing the row, so unanswered and blank are one state", async () => {
    const p = await person(riverside, "Cleared");
    const f = await define(riverside, "Clearable", "text");
    const actor = as(riverside, "owner");

    await run(riverside, "owner", (tx) => setCustomValues(tx, actor, "person", p.id, { [f.id]: "something" }));
    expect(await owner()`select id from custom_field_values where field_id = ${f.id}`).toHaveLength(1);

    await run(riverside, "owner", (tx) => setCustomValues(tx, actor, "person", p.id, { [f.id]: null }));
    expect(await owner()`select id from custom_field_values where field_id = ${f.id}`).toHaveLength(0);
  });

  it("leaves fields the form did not render alone", async () => {
    const p = await person(riverside, "Partial");
    const shown = await define(riverside, "Shown", "text");
    const hidden = await define(riverside, "Hidden", "text");
    const actor = as(riverside, "owner");

    await run(riverside, "owner", (tx) =>
      setCustomValues(tx, actor, "person", p.id, { [shown.id]: "a", [hidden.id]: "b" }),
    );
    // A later save that only knows about one field must not wipe the other.
    await run(riverside, "owner", (tx) => setCustomValues(tx, actor, "person", p.id, { [shown.id]: "c" }));

    const saved = await run(riverside, "owner", (tx) => getCustomValues(tx, "person", p.id));
    expect(saved[shown.id]).toBe("c");
    expect(saved[hidden.id]).toBe("b");
  });

  it("overwrites rather than accumulating rows", async () => {
    const p = await person(riverside, "Overwritten");
    const f = await define(riverside, "Once", "text");
    const actor = as(riverside, "owner");

    for (const v of ["one", "two", "three"]) {
      await run(riverside, "owner", (tx) => setCustomValues(tx, actor, "person", p.id, { [f.id]: v }));
    }

    const rows = await owner()<{ value: string }[]>`
      select value from custom_field_values where field_id = ${f.id} and entity_id = ${p.id}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe("three");
  });

  it("ignores a field id belonging to another church", async () => {
    const p = await person(riverside, "Foreigner");
    const foreign = await define(northgate, "Theirs", "text");

    await run(riverside, "owner", (tx) =>
      setCustomValues(tx, as(riverside, "owner"), "person", p.id, { [foreign.id]: "leaked" }),
    );

    const rows = await owner()`select id from custom_field_values where field_id = ${foreign.id}`;
    expect(rows).toHaveLength(0);
  });
});

describe("checking a value against its field", () => {
  const def = (type: string, options: string[] | null = null) => ({
    id: "x", entity: "person", key: "k", label: "Field", type, options,
    memberEditable: false,
  });

  it("refuses text where a number belongs", () => {
    expect(coerceCustomValue(def("number"), "seven")).toHaveProperty("error");
    expect(coerceCustomValue(def("number"), "7")).toEqual({ value: 7 });
  });

  it("refuses a malformed date and a date-shaped impossibility", () => {
    expect(coerceCustomValue(def("date"), "01/05/2024")).toHaveProperty("error");
    expect(coerceCustomValue(def("date"), "2024-13-01")).toHaveProperty("error");
    expect(coerceCustomValue(def("date"), "2024-05-01")).toEqual({ value: "2024-05-01" });
  });

  it("refuses a choice that is not on the list", () => {
    const field = def("select", ["Morning", "Evening"]);
    expect(coerceCustomValue(field, "Afternoon")).toHaveProperty("error");
    expect(coerceCustomValue(field, "Morning")).toEqual({ value: "Morning" });
  });

  it("refuses any unlisted value in a multiple choice", () => {
    const field = def("multi_select", ["A", "B"]);
    expect(coerceCustomValue(field, ["A", "C"])).toHaveProperty("error");
    expect(coerceCustomValue(field, ["A", "B"])).toEqual({ value: ["A", "B"] });
  });

  it("treats every kind of blank as nothing recorded", () => {
    for (const type of ["text", "number", "date", "select", "multi_select"]) {
      expect(coerceCustomValue(def(type, ["A"]), "")).toEqual({ value: null });
      expect(coerceCustomValue(def(type, ["A"]), null)).toEqual({ value: null });
    }
    expect(coerceCustomValue(def("multi_select", ["A"]), [])).toEqual({ value: null });
  });

  it("makes a missing checkbox a no, not a nothing", () => {
    expect(coerceCustomValue(def("boolean"), null)).toEqual({ value: false });
    expect(coerceCustomValue(def("boolean"), true)).toEqual({ value: true });
  });
});

describe("changing a definition", () => {
  it("renames and re-lists the choices", async () => {
    const f = await define(riverside, "Renameable", "select", ["A", "B"]);
    await run(riverside, "owner", (tx) =>
      updateCustomField(tx, as(riverside, "owner"), f.id, { label: P + "Renamed", options: ["A", "B", "C"] }),
    );
    const all = await run(riverside, "owner", (tx) => listCustomFields(tx, "person"));
    const after = all.find((x) => x.id === f.id)!;
    expect(after.label).toBe(P + "Renamed");
    expect(after.options).toEqual(["A", "B", "C"]);
    // The key does not follow the label, because exports address a field by key.
    expect(after.key).toBe(f.key);
  });

  it("deletes the field and everything recorded in it", async () => {
    const f = await define(riverside, "Doomed field", "text");
    const p = await person(riverside, "Doomed");
    await run(riverside, "owner", (tx) =>
      setCustomValues(tx, as(riverside, "owner"), "person", p.id, { [f.id]: "gone soon" }),
    );

    const result = await run(riverside, "owner", (tx) => deleteCustomField(tx, as(riverside, "owner"), f.id));
    expect(result.valuesRemoved).toBe(1);
    expect(await owner()`select id from custom_field_values where field_id = ${f.id}`).toHaveLength(0);
    expect(await owner()`select id from members where id = ${p.id}`).toHaveLength(1);
  });

  it("cannot touch another church's field", async () => {
    const foreign = await define(northgate, "Protected field", "text");
    const actor = as(riverside, "owner");

    await expect(
      run(riverside, "owner", (tx) => updateCustomField(tx, actor, foreign.id, { label: P + "Hijacked" })),
    ).rejects.toThrow(/No such field/);
    await expect(
      run(riverside, "owner", (tx) => deleteCustomField(tx, actor, foreign.id)),
    ).rejects.toThrow(/No such field/);

    expect(await owner()`select id from custom_fields where id = ${foreign.id}`).toHaveLength(1);
  });

  it("does not show another church's fields", async () => {
    await define(northgate, "Northgate only", "text");
    const here = await run(riverside, "owner", (tx) => listCustomFields(tx, "person"));
    expect(here.map((f) => f.label)).not.toContain(P + "Northgate only");
  });
});

describe("who may do what", () => {
  it("refuses staff the definition and allows staff the value", async () => {
    const f = await define(riverside, "Staffcheck", "text");
    const p = await person(riverside, "Staffed");

    await expect(
      run(riverside, "staff", (tx) =>
        createCustomField(tx, as(riverside, "staff"), { entity: "person", label: P + "Nope", type: "text" }),
      ),
    ).rejects.toThrow(PermissionError);
    await expect(
      run(riverside, "staff", (tx) => deleteCustomField(tx, as(riverside, "staff"), f.id)),
    ).rejects.toThrow(PermissionError);

    await run(riverside, "staff", (tx) =>
      setCustomValues(tx, as(riverside, "staff"), "person", p.id, { [f.id]: "staff wrote this" }),
    );
    const saved = await run(riverside, "staff", (tx) => getCustomValues(tx, "person", p.id));
    expect(saved[f.id]).toBe("staff wrote this");
  });

  it("refuses a member and a check-in volunteer the value too", async () => {
    const f = await define(riverside, "Locked", "text");
    const p = await person(riverside, "Locked");

    for (const role of ["member", "checkin_volunteer"] as TenantRole[]) {
      await expect(
        run(riverside, role, (tx) =>
          setCustomValues(tx, as(riverside, role), "person", p.id, { [f.id]: "no" }),
        ),
      ).rejects.toThrow(PermissionError);
    }
  });
});

describe("the audit log", () => {
  it("records the definition and the value separately", async () => {
    const userId = (await owner()<{ id: string }[]>`
      select id from app_users where email = 'pastor@riverside.example.org'`)[0]!.id;
    const ctx = { tenantId: riverside, role: "owner" as TenantRole, userId };
    const actor = as(riverside, "owner");

    const f = await withTenant(ctx, (tx) =>
      createCustomField(tx, actor, { entity: "person", label: P + "Audited field", type: "text" }),
    );
    const p = await person(riverside, "Auditedfield");
    await withTenant(ctx, (tx) => setCustomValues(tx, actor, "person", p.id, { [f.id]: "recorded" }));

    const onField = await owner()<{ action: string }[]>`
      select action from audit_entries where entity = 'custom_fields' and entity_id = ${f.id}`;
    expect(onField.map((e) => e.action)).toContain("insert");

    const onValue = await owner()<{ actor_user_id: string }[]>`
      select actor_user_id from audit_entries
       where entity = 'custom_field_values' and after ->> 'field_id' = ${f.id}`;
    expect(onValue).toHaveLength(1);
    expect(onValue[0]!.actor_user_id).toBe(userId);
  });
});
