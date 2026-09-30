/**
 * HRT-28, the parts that touch no database (R19.1, R2.8).
 *
 * A church's spreadsheet is the messiest input this product will ever take, and
 * every one of these cases came from thinking about what a real export contains
 * rather than what a tidy one does.
 */
import { describe, it, expect } from "vitest";
import { readSheet, parseDelimited, detectDelimiter } from "../src/import/csv";
import { guessMapping, parseImportedDate, parseLifecycle, parseHouseholdRole, IGNORE } from "../src/import/columns";
import { indexPeople, findMatches, normalisePhone, normaliseName, type ExistingPerson } from "../src/import/match";

describe("reading a file", () => {
  it("keeps a comma that is inside quotes", () => {
    const sheet = readSheet('Name,Address\n"Bennett, Sarah","12 Oak St, Austin"\n');
    expect(sheet.rows[0]).toEqual({ Name: "Bennett, Sarah", Address: "12 Oak St, Austin" });
  });

  it("keeps a newline that is inside quotes, and still counts file lines", () => {
    const sheet = readSheet('Name,Note\n"Carter","first line\nsecond line"\nRamirez,plain\n');
    expect(sheet.rows[0]!["Note"]).toBe("first line\nsecond line");
    // The Ramirez row is on line 4 of the file, not line 3.
    expect(sheet.lineNumbers[1]).toBe(4);
  });

  it("reads a doubled quote as one quote", () => {
    const sheet = readSheet('Name\n"She said ""hello"""\n');
    expect(sheet.rows[0]!["Name"]).toBe('She said "hello"');
  });

  it("strips the byte order mark Excel writes", () => {
    const sheet = readSheet('﻿First name,Last name\nSarah,Bennett\n');
    expect(sheet.headers[0]).toBe("First name");
  });

  it("handles CRLF", () => {
    const sheet = readSheet("First,Last\r\nSarah,Bennett\r\n");
    expect(sheet.rows).toEqual([{ First: "Sarah", Last: "Bennett" }]);
  });

  it("reads a file with no trailing newline", () => {
    const sheet = readSheet("First,Last\nSarah,Bennett");
    expect(sheet.rows).toHaveLength(1);
  });

  it("ignores blank lines", () => {
    const sheet = readSheet("First,Last\n\nSarah,Bennett\n\n\n");
    expect(sheet.rows).toHaveLength(1);
  });

  it("pads a short row rather than shifting its values", () => {
    const sheet = readSheet("First,Last,Email\nSarah,Bennett\n");
    expect(sheet.rows[0]).toEqual({ First: "Sarah", Last: "Bennett", Email: "" });
  });

  it("does not let a second column of the same name eat the first", () => {
    const sheet = readSheet("Email,Email\na@example.org,b@example.org\n");
    expect(sheet.headers).toEqual(["Email", "Email (2)"]);
    expect(sheet.rows[0]).toEqual({ Email: "a@example.org", "Email (2)": "b@example.org" });
  });

  it("reads tab separated, which is what a paste from a spreadsheet gives", () => {
    expect(detectDelimiter("First\tLast\n")).toBe("\t");
    const sheet = readSheet("First\tLast\nSarah\tBennett\n");
    expect(sheet.rows[0]).toEqual({ First: "Sarah", Last: "Bennett" });
  });

  it("returns nothing for an empty file rather than throwing", () => {
    expect(readSheet("")).toEqual({ headers: [], rows: [], lineNumbers: [] });
  });

  it("names an unnamed column instead of losing it", () => {
    const { cells } = parseDelimited("a,,c\n1,2,3\n");
    expect(cells[0]).toEqual(["a", "", "c"]);
    expect(readSheet("a,,c\n1,2,3\n").headers[1]).toBe("Column 2");
  });
});

describe("guessing the mapping", () => {
  it("recognises the spellings real exports use", () => {
    const m = guessMapping(["First Name", "Last Name", "Email Address", "Mobile Phone", "DOB", "Membership Status"]);
    expect(m["First Name"]).toBe("firstName");
    expect(m["Last Name"]).toBe("lastName");
    expect(m["Email Address"]).toBe("email");
    expect(m["Mobile Phone"]).toBe("phone");
    expect(m["DOB"]).toBe("dateOfBirth");
    expect(m["Membership Status"]).toBe("lifecycleStatus");
  });

  it("copes with underscores and capitals", () => {
    const m = guessMapping(["first_name", "LAST_NAME", "e-mail"]);
    expect(m["first_name"]).toBe("firstName");
    expect(m["LAST_NAME"]).toBe("lastName");
    expect(m["e-mail"]).toBe("email");
  });

  it("gives a field to one column only, so the second is left for a person to decide", () => {
    const m = guessMapping(["Email", "Email (2)"]);
    expect(m["Email"]).toBe("email");
    expect(m["Email (2)"]).toBe(IGNORE);
  });

  it("leaves a column it does not recognise alone", () => {
    const m = guessMapping(["First Name", "Favourite hymn"]);
    expect(m["Favourite hymn"]).toBe(IGNORE);
  });
});

describe("dates, as a spreadsheet actually holds them", () => {
  it("takes ISO at face value", () => {
    expect(parseImportedDate("1986-04-12")).toEqual({ value: "1986-04-12" });
  });

  it("reads slashes in US order, because the first churches are in the US", () => {
    expect(parseImportedDate("4/12/1986")).toEqual({ value: "1986-04-12" });
    expect(parseImportedDate("04/12/1986")).toEqual({ value: "1986-04-12" });
  });

  it("refuses rather than guesses when there is no US reading", () => {
    // 13 is not a month. Silently reading it as a day would be a wrong birthday
    // that nobody ever notices.
    expect(parseImportedDate("13/04/1990")).toEqual({ error: "malformed" });
  });

  it("reads a month name", () => {
    expect(parseImportedDate("March 12, 1986")).toEqual({ value: "1986-03-12" });
  });

  it("windows a two digit year backwards, because these are birthdays", () => {
    expect(parseImportedDate("4/12/86")).toEqual({ value: "1986-04-12" });
    expect(parseImportedDate("4/12/05")).toEqual({ value: "2005-04-12" });
  });

  it("refuses a date that does not exist", () => {
    expect(parseImportedDate("2/31/1990")).toEqual({ error: "malformed" });
    expect(parseImportedDate("not a date")).toEqual({ error: "malformed" });
  });

  it("treats blank as blank, not as an error", () => {
    expect(parseImportedDate("   ")).toEqual({ value: "" });
  });
});

describe("mapping a church's own words onto ours", () => {
  it("reads whatever they call a status", () => {
    expect(parseLifecycle("Member")).toBe("member");
    expect(parseLifecycle("Active Member")).toBe("member");
    expect(parseLifecycle("Regular Attender")).toBe("regular_attender");
    expect(parseLifecycle("Lapsed")).toBe("inactive");
    expect(parseLifecycle("Deceased")).toBe("deceased");
    expect(parseLifecycle("")).toBe("visitor");
    expect(parseLifecycle("Something else entirely")).toBe("visitor");
  });

  it("reads a household role", () => {
    expect(parseHouseholdRole("Head of Household")).toBe("head");
    expect(parseHouseholdRole("Wife")).toBe("spouse");
    expect(parseHouseholdRole("Son")).toBe("child");
    expect(parseHouseholdRole("")).toBe("other");
  });
});

describe("normalising", () => {
  it("treats a phone as its last ten digits", () => {
    expect(normalisePhone("(512) 555-0148")).toBe("5125550148");
    expect(normalisePhone("+1 512.555.0148")).toBe("5125550148");
  });

  it("treats a name without its punctuation and accents", () => {
    expect(normaliseName("O'Brien")).toBe(normaliseName("OBrien"));
    expect(normaliseName("Zoë")).toBe("zoe");
  });
});

// ---------------------------------------------------------------------------
// R2.8, the acceptance criterion
// ---------------------------------------------------------------------------

const person = (n: number, over: Partial<ExistingPerson> = {}): ExistingPerson => ({
  id: `id-${n}`,
  firstName: `First${n}`,
  lastName: `Last${n}`,
  preferredName: null,
  dateOfBirth: `19${String(50 + (n % 50)).padStart(2, "0")}-01-01`,
  emails: [`person${n}@example.org`],
  phones: [`512555${String(n).padStart(4, "0")}`],
  ...over,
});

describe("duplicate detection (R2.8)", () => {
  const index = indexPeople([
    person(1),
    person(2, { firstName: "Mary", lastName: "Smith", dateOfBirth: "1970-02-02", emails: [], phones: [] }),
    person(3, { firstName: "Mary", lastName: "Smith", dateOfBirth: "1992-06-06", emails: [], phones: [] }),
    person(4, { firstName: "Sarah", lastName: "Bennett", emails: ["sarah.bennett@example.org"], phones: ["5125550100"] }),
    person(5, { firstName: "Michael", lastName: "Bennett", emails: [], phones: ["5125550100"] }),
  ]);

  it("is certain about a matching email address", () => {
    const [m] = findMatches(index, { firstName: "S", lastName: "B", email: "SARAH.BENNETT@example.org" });
    expect(m?.personId).toBe("id-4");
    expect(m?.confidence).toBe("certain");
    expect(m?.reason).toBe("import.match.email");
  });

  it("is certain about a name plus a date of birth", () => {
    const [m] = findMatches(index, { firstName: "Mary", lastName: "Smith", dateOfBirth: "1970-02-02" });
    expect(m?.personId).toBe("id-2");
    expect(m?.confidence).toBe("certain");
  });

  it("does not match the other Mary Smith, who has a different birthday", () => {
    const matches = findMatches(index, { firstName: "Mary", lastName: "Smith", dateOfBirth: "1970-02-02" });
    expect(matches.map((m) => m.personId)).not.toContain("id-3");
  });

  it("is only possible about a name on its own, because there are two Mary Smiths", () => {
    const matches = findMatches(index, { firstName: "Mary", lastName: "Smith" });
    expect(matches).toHaveLength(2);
    expect(matches.every((m) => m.confidence === "possible")).toBe(true);
  });

  it("treats a shared household line as a household, not as a person", () => {
    // Michael and Sarah share 5125550100. A new Bennett on that number is likely.
    const matches = findMatches(index, { firstName: "Anna", lastName: "Bennett", phone: "(512) 555-0100" });
    expect(matches.every((m) => m.confidence !== "certain")).toBe(true);
    expect(matches.some((m) => m.confidence === "likely")).toBe(true);
  });

  it("finds nobody when there is nobody", () => {
    expect(findMatches(index, { firstName: "Nobody", lastName: "Here" })).toEqual([]);
  });

  it("surfaces at least 38 of 40 known duplicates in a file of 500", () => {
    // The acceptance criterion, stated in PRD R2.8.
    const existing = Array.from({ length: 500 }, (_, i) => person(i));
    const big = indexPeople(existing);

    // Forty rows that are the same people, arriving the way a second export
    // does: some with the email, some with only a name and a birthday, some
    // with the name spelled slightly differently, some by phone.
    const incoming = Array.from({ length: 40 }, (_, k) => {
      const source = existing[k * 12]!;
      switch (k % 4) {
        case 0:
          return { firstName: source.firstName, lastName: source.lastName, email: source.emails[0]!.toUpperCase() };
        case 1:
          return { firstName: source.firstName, lastName: source.lastName, dateOfBirth: source.dateOfBirth };
        case 2:
          return { firstName: source.firstName, lastName: source.lastName, phone: `+1 ${source.phones[0]}` };
        default:
          return { firstName: source.firstName.toLowerCase(), lastName: source.lastName, email: source.emails[0]! };
      }
    });

    const found = incoming.filter((row, k) => {
      const matches = findMatches(big, row);
      return matches.some((m) => m.personId === existing[k * 12]!.id);
    });

    expect(found.length).toBeGreaterThanOrEqual(38);
  });

  it("does not invent matches for 500 genuinely new people", () => {
    const existing = Array.from({ length: 500 }, (_, i) => person(i));
    const big = indexPeople(existing);
    const strangers = Array.from({ length: 100 }, (_, k) => ({
      firstName: `New${k}`,
      lastName: `Person${k}`,
      email: `new${k}@example.org`,
    }));
    const falsePositives = strangers.filter((s) => findMatches(big, s).length > 0);
    expect(falsePositives).toEqual([]);
  });
});
