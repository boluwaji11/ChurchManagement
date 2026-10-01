/**
 * HRT-102. Leaving Planning Center, Breeze or ChurchTrac (R19.5).
 *
 * A dedicated importer is not a second pipeline. It is knowing what each of
 * those three calls a household before a volunteer has to work it out. So these
 * tests use each system's own header row, and check the two things that matter:
 * that the file is recognised, and that the columns land on the right fields
 * with none of them written to twice.
 */
import { describe, it, expect } from "vitest";
import { detectSource, sourceMapping, IMPORT_SOURCES } from "../src/import/sources";
import { guessMapping, IGNORE } from "../src/import/columns";

/** Header rows as these systems write them. */
const HEADERS = {
  planning_center: [
    "First Name", "Last Name", "Nickname", "Birthdate", "Gender", "Membership",
    "Status", "Email", "Mobile Phone", "Home Phone", "Household", "Created At",
  ],
  breeze: [
    "Breeze ID", "First Name", "Last Name", "Nickname", "Birthdate", "Status",
    "Email", "Mobile", "Family", "Family Role", "Joined Date",
  ],
  churchtrac: [
    "FirstName", "LastName", "Nickname", "BirthDate", "MemberStatus", "Email",
    "CellPhone", "FamilyName", "FamilyPosition", "MembershipDate",
  ],
} as const;

const mapped = (key: keyof typeof HEADERS) => {
  const headers = [...HEADERS[key]];
  return sourceMapping(key, headers, guessMapping(headers));
};

describe("recognising the file", () => {
  it("names each of the three from its own header row", () => {
    expect(detectSource([...HEADERS.planning_center])).toBe("planning_center");
    expect(detectSource([...HEADERS.breeze])).toBe("breeze");
    expect(detectSource([...HEADERS.churchtrac])).toBe("churchtrac");
  });

  it("says nothing about a spreadsheet somebody typed themselves", () => {
    expect(detectSource(["Name", "Email", "Phone"])).toBeNull();
  });

  it("says nothing when a file only half matches", () => {
    // Half a signature is where a wrong guess costs more than no guess:
    // somebody reading a mapping they half recognise stops reading.
    expect(detectSource(["First Name", "Last Name", "Household"])).toBeNull();
    expect(detectSource(["First Name", "Family"])).toBeNull();
  });

  it("does not care how the header was punctuated or cased", () => {
    expect(detectSource(["family", "FAMILY_ROLE", "First Name"])).toBe("breeze");
  });
});

describe("Planning Center", () => {
  const mapping = mapped("planning_center");

  it("puts the household, the name and the birthday where they belong", () => {
    expect(mapping["Household"]).toBe("householdName");
    expect(mapping["First Name"]).toBe("firstName");
    expect(mapping["Last Name"]).toBe("lastName");
    expect(mapping["Nickname"]).toBe("preferredName");
    expect(mapping["Birthdate"]).toBe("dateOfBirth");
  });

  it("reads Membership as the status, and leaves Status alone", () => {
    // Membership says member or visitor. Status says active or inactive, which
    // is a different question, and reading it as lifecycle turns every inactive
    // person in the church into a visitor.
    expect(mapping["Membership"]).toBe("lifecycleStatus");
    expect(mapping["Status"]).toBe(IGNORE);
  });

  it("takes the mobile and leaves the second phone out", () => {
    expect(mapping["Mobile Phone"]).toBe("phone");
    expect(mapping["Home Phone"]).toBe(IGNORE);
  });

  it("drops their bookkeeping", () => {
    expect(mapping["Created At"]).toBe(IGNORE);
  });
});

describe("Breeze", () => {
  const mapping = mapped("breeze");

  it("reads a family as a household, with the role on it", () => {
    expect(mapping["Family"]).toBe("householdName");
    expect(mapping["Family Role"]).toBe("householdRole");
  });

  it("takes the date they joined", () => {
    expect(mapping["Joined Date"]).toBe("membershipDate");
  });

  it("drops their own id", () => {
    expect(mapping["Breeze ID"]).toBe(IGNORE);
  });
});

describe("ChurchTrac", () => {
  const mapping = mapped("churchtrac");

  it("reads headers written with no spaces at all", () => {
    expect(mapping["FirstName"]).toBe("firstName");
    expect(mapping["LastName"]).toBe("lastName");
    expect(mapping["FamilyName"]).toBe("householdName");
    expect(mapping["FamilyPosition"]).toBe("householdRole");
    expect(mapping["MemberStatus"]).toBe("lifecycleStatus");
    expect(mapping["CellPhone"]).toBe("phone");
    expect(mapping["MembershipDate"]).toBe("membershipDate");
  });
});

describe("what a mapping must never do", () => {
  it("never writes two columns to one field", () => {
    for (const key of ["planning_center", "breeze", "churchtrac"] as const) {
      const taken = Object.values(mapped(key)).filter((field) => field !== IGNORE);
      expect(new Set(taken).size, key).toBe(taken.length);
    }
  });

  it("still matches a column the church added itself", () => {
    const headers = [...HEADERS.breeze, "Email"];
    const mapping = sourceMapping("breeze", headers, guessMapping(headers));
    expect(mapping["Email"]).toBe("email");
  });

  it("leaves a column none of them know about unmapped rather than guessing", () => {
    const headers = [...HEADERS.churchtrac, "Baptism Location"];
    const mapping = sourceMapping("churchtrac", headers, guessMapping(headers));
    expect(mapping["Baptism Location"] ?? IGNORE).toBe(IGNORE);
  });

  it("every field a source names is a field that exists", () => {
    // A rename in PERSON_FIELDS that forgets these three lists would silently
    // stop mapping a column rather than failing.
    for (const source of IMPORT_SOURCES) {
      for (const [header, field] of Object.entries(source.columns)) {
        if (field === IGNORE) continue;
        const headers = [header];
        expect(sourceMapping(source.key, headers, guessMapping(headers))[header], `${source.key}.${header}`)
          .toBe(field);
      }
    }
  });
});
