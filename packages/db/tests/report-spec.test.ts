import { describe, it, expect } from "vitest";
import { cleanSpec, SUBJECTS } from "../src/repo/report-spec";

/**
 * The gate between a built report and the database.
 *
 * Everything the compiler puts in a query comes from a key that got through
 * here, so a key that should not get through is the whole of the risk. These
 * run against the pure catalogue and touch nothing.
 */
describe("cleanSpec", () => {
  it("drops a field that is not in the catalogue", () => {
    const spec = cleanSpec({
      subject: "people",
      filters: [
        { field: "status", op: "is", value: "member" },
        { field: "password_hash", op: "is", value: "x" },
      ],
      columns: ["name", "password_hash", "allergies"],
    });

    expect(spec.filters).toHaveLength(1);
    expect(spec.filters[0]!.field).toBe("status");
    expect(spec.columns).toEqual(["name"]);
  });

  it("drops an operator the field's kind does not have", () => {
    const spec = cleanSpec({
      subject: "people",
      // "contains" belongs to text, not to a boolean.
      filters: [{ field: "inGroup", op: "contains", value: "yes" }],
    });
    expect(spec.filters).toHaveLength(0);
  });

  it("falls back to people when the subject is unknown", () => {
    expect(cleanSpec({ subject: "tenants" }).subject).toBe("people");
  });

  it("keeps a condition that needs no value, and drops one that is missing it", () => {
    const spec = cleanSpec({
      subject: "people",
      filters: [
        { field: "joinedOn", op: "empty", value: "" },
        { field: "name", op: "contains", value: "  " },
      ],
    });
    expect(spec.filters).toHaveLength(1);
    expect(spec.filters[0]!.op).toBe("empty");
  });

  it("refuses to count by a field that cannot be grouped", () => {
    expect(cleanSpec({ subject: "people", groupBy: "name" }).groupBy).toBeNull();
    expect(cleanSpec({ subject: "people", groupBy: "status" }).groupBy).toBe("status");
  });

  it("refuses to add up a field that is not a number", () => {
    const spec = cleanSpec({
      subject: "people",
      groupBy: "status",
      measure: { kind: "sum", field: "name" },
    });
    expect(spec.measure).toEqual({ kind: "rows" });
  });

  it("gives a list columns when it was sent none", () => {
    const spec = cleanSpec({ subject: "attendance" });
    expect(spec.columns.length).toBeGreaterThan(0);
    for (const key of spec.columns) {
      expect(SUBJECTS.attendance.fields.some((one) => one.key === key)).toBe(true);
    }
  });

  it("caps how many conditions and columns one report can carry", () => {
    const many = Array.from({ length: 40 }, () => ({
      field: "name", op: "contains", value: "a",
    }));
    expect(cleanSpec({ subject: "people", filters: many }).filters).toHaveLength(10);
  });

  it("survives rubbish", () => {
    expect(() => cleanSpec(null)).not.toThrow();
    expect(() => cleanSpec({ filters: "not an array", columns: 7 })).not.toThrow();
  });
});
