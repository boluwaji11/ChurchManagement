/**
 * HRT-151. Reading a submission as a person (R4.4).
 *
 * Pure: no database. What a church set on each question decides where each
 * answer lands, and whether the form named anybody at all.
 */
import { describe, it, expect } from "vitest";
import { identityFrom, namesSomebody } from "../src/repo/form-matching";
import { targetsFor, targetAllowed, CUSTOM_TARGET, type FormFieldDef } from "../src/repo/form-rules";

const field = (over: Partial<FormFieldDef> & { id: string }): FormFieldDef => ({
  kind: "text",
  label: "Question",
  help: null,
  required: false,
  options: null,
  position: 0,
  showWhen: null,
  mapsTo: null,
  ...over,
});

describe("which targets a question can carry", () => {
  it("holds an email question to an email address", () => {
    expect(targetsFor("email")).toEqual(["email"]);
    expect(targetAllowed("email", "email")).toBe(true);
    expect(targetAllowed("email", "first_name")).toBe(false);
  });

  it("gives a date question the one date a person has", () => {
    expect(targetsFor("date")).toEqual(["date_of_birth"]);
  });

  it("offers a short answer the names and the address parts", () => {
    expect(targetsFor("text")).toContain("first_name");
    expect(targetsFor("text")).toContain("postal_code");
  });

  it("lets any answerable question carry one of the church's own fields", () => {
    const own = `${CUSTOM_TARGET}3f2504e0-4f89-41d3-9a0c-0305e82c3301`;
    expect(targetAllowed("multi_select", own)).toBe(true);
    expect(targetAllowed("section", own)).toBe(false);
  });

  it("allows no target at all, which is most questions", () => {
    expect(targetAllowed("long_text", null)).toBe(true);
  });
});

describe("reading the answers through the targets", () => {
  const fields = [
    field({ id: "a", kind: "text", mapsTo: "first_name" }),
    field({ id: "b", kind: "text", mapsTo: "last_name" }),
    field({ id: "c", kind: "email", mapsTo: "email" }),
    field({ id: "d", kind: "phone", mapsTo: "phone" }),
    field({ id: "e", kind: "text", mapsTo: "city" }),
    field({ id: "f", kind: "long_text", mapsTo: null }),
    field({ id: "g", kind: "multi_select", mapsTo: `${CUSTOM_TARGET}abc` }),
  ];

  it("puts each answer where the church said it goes", () => {
    const got = identityFrom(fields, {
      a: " Maria ",
      b: "Alvarez",
      c: "Maria@Example.COM",
      d: "(512) 555-0148",
      e: "Austin",
      f: "I am hoping for a group near me.",
      g: ["Tuesday", "Thursday"],
    });

    expect(got.firstName).toBe("Maria");
    expect(got.lastName).toBe("Alvarez");
    expect(got.email).toBe("maria@example.com");
    expect(got.phone).toBe("(512) 555-0148");
    expect(got.address.city).toBe("Austin");
    expect(got.custom).toEqual({ abc: ["Tuesday", "Thursday"] });
  });

  it("leaves an untargeted answer on the response and nowhere else", () => {
    const got = identityFrom(fields, { f: "Something they wrote" });
    expect(got.firstName).toBeNull();
    expect(got.custom).toEqual({});
  });

  it("ignores a blank answer rather than writing an empty field", () => {
    const got = identityFrom(fields, { a: "   ", c: "" });
    expect(got.firstName).toBeNull();
    expect(got.email).toBeNull();
  });
});

describe("whether the form named anybody", () => {
  const named = (over: Record<string, unknown>) =>
    namesSomebody({
      firstName: null, lastName: null, preferredName: null,
      email: null, phone: null, dateOfBirth: null,
      address: { line1: null, line2: null, city: null, region: null, postalCode: null, country: null },
      custom: {},
      ...over,
    } as never);

  it("takes an email address on its own", () => {
    expect(named({ email: "maria@example.com" })).toBe(true);
  });

  it("takes a phone number on its own", () => {
    expect(named({ phone: "5125550148" })).toBe(true);
  });

  it("needs both halves of a name", () => {
    expect(named({ firstName: "Maria" })).toBe(false);
    expect(named({ firstName: "Maria", lastName: "Alvarez" })).toBe(true);
  });

  it("says no to a form that asked nothing about the person", () => {
    expect(named({})).toBe(false);
  });
});
