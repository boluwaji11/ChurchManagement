import type { CustomFieldDef } from "../repo/custom-fields";

/**
 * R19.1. The fields a file can be mapped onto, and the guess at which column is
 * which.
 *
 * Auto-mapping is not a convenience. A church's export has thirty columns and
 * the person doing the import is a volunteer with an hour on a Tuesday. Getting
 * twenty-five of them right before they look is the difference between a feature
 * they use and a feature they abandon.
 *
 * The guess is always shown and always editable. It is a starting point, never a
 * decision made on their behalf.
 */

export interface TargetField {
  key: string;
  /** The catalogue key for its label. */
  label: string;
  /** Header spellings seen in real exports, lowercased and stripped of punctuation. */
  aliases: string[];
  required?: boolean;
}

export const PERSON_FIELDS: TargetField[] = [
  { key: "firstName", label: "personForm.firstName", required: true,
    aliases: ["first name", "firstname", "given name", "givenname", "first", "forename", "fname"] },
  { key: "lastName", label: "personForm.lastName", required: true,
    aliases: ["last name", "lastname", "surname", "family name", "familyname", "last", "lname"] },
  { key: "preferredName", label: "personForm.preferredName",
    aliases: ["preferred name", "nickname", "goes by", "known as", "display name", "middle name"] },
  { key: "email", label: "personForm.email",
    aliases: ["email", "email address", "e mail", "primary email", "home email", "personal email"] },
  { key: "phone", label: "personForm.phone",
    aliases: ["phone", "phone number", "mobile", "mobile phone", "cell", "cell phone", "telephone", "home phone"] },
  { key: "dateOfBirth", label: "personForm.dateOfBirth",
    aliases: ["date of birth", "dob", "birthday", "birth date", "birthdate", "born"] },
  { key: "lifecycleStatus", label: "personForm.status",
    aliases: ["status", "membership status", "member status", "lifecycle", "type", "person type"] },
  { key: "membershipDate", label: "personForm.membershipDate",
    aliases: ["membership date", "member since", "date joined", "joined", "join date"] },
  { key: "firstVisitOn", label: "personForm.firstVisit",
    aliases: ["first visit", "first attended", "first visit date", "visitor date"] },
  { key: "householdName", label: "personForm.household",
    aliases: ["household", "household name", "family", "family name", "family id"] },
  { key: "householdRole", label: "personForm.householdRole",
    aliases: ["household role", "family role", "relationship", "role in family", "family position"] },
  { key: "address", label: "personForm.address",
    aliases: ["address", "home address", "street address", "street", "address line 1", "address 1", "mailing address"] },
  { key: "addressLine2", label: "address.line2",
    aliases: ["address line 2", "address 2", "apartment", "unit", "suite"] },
  { key: "city", label: "address.city",
    aliases: ["city", "town", "suburb"] },
  { key: "region", label: "address.region",
    aliases: ["state", "province", "county", "region"] },
  { key: "postalCode", label: "address.postalCode",
    aliases: ["zip", "zip code", "postcode", "postal code", "post code"] },
  { key: "maritalStatus", label: "person.maritalStatus",
    aliases: ["marital status", "marital", "married", "relationship status"] },
  { key: "schoolLevel", label: "person.schoolLevel",
    aliases: ["school level", "grade", "school grade", "grade level", "year group", "school year"] },
  { key: "allergies", label: "personForm.allergies",
    aliases: ["allergies", "allergy", "allergen", "allergens"] },
  { key: "medicalNote", label: "personForm.medicalNote",
    aliases: ["medical", "medical note", "medical notes", "medical information", "conditions"] },
  { key: "tags", label: "tags.title",
    aliases: ["tags", "tag", "labels", "label", "attributes"] },
];

/** The value used in a mapping to mean "do not import this column". */
export const IGNORE = "";

const normalise = (header: string): string =>
  header
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Guesses a mapping from headers to fields.
 *
 * An exact alias wins. Failing that, a header that contains an alias as a whole
 * phrase wins, so "Primary Email Address" finds "email address". Each field is
 * claimed once: the first column that matches takes it, and a second "Email"
 * column is left unmapped rather than quietly overwriting the first.
 */
export function guessMapping(headers: string[], custom: CustomFieldDef[] = []): Record<string, string> {
  const targets = [
    ...PERSON_FIELDS,
    ...custom.map((f) => ({ key: `cf:${f.id}`, label: f.label, aliases: [normalise(f.label)] })),
  ];

  const mapping: Record<string, string> = {};
  const claimed = new Set<string>();

  const claim = (header: string, key: string) => {
    mapping[header] = key;
    claimed.add(key);
  };

  for (const header of headers) {
    const n = normalise(header);
    const exact = targets.find((t) => !claimed.has(t.key) && t.aliases.includes(n));
    if (exact) claim(header, exact.key);
  }

  for (const header of headers) {
    if (mapping[header]) continue;
    const n = normalise(header);
    const loose = targets.find(
      (t) => !claimed.has(t.key) && t.aliases.some((a) => n === a || n.includes(` ${a}`) || n.startsWith(`${a} `) || n.endsWith(` ${a}`)),
    );
    if (loose) claim(header, loose.key);
  }

  for (const header of headers) mapping[header] ??= IGNORE;
  return mapping;
}

/**
 * Dates, as a church's spreadsheet actually holds them.
 *
 * ISO is taken at face value. Anything else is ambiguous, and the ambiguity that
 * matters is 03/04/1990, which is March in a US export and April in a British
 * one. This reads US order, because the first churches are in the US, and refuses
 * rather than guesses when the value cannot be one: 13/04/1990 has no US reading,
 * so it is an error the person can see and fix, not a silent wrong birthday.
 */
export function parseImportedDate(raw: string): { value: string } | { error: "malformed" } {
  const v = raw.trim();
  if (!v) return { value: "" };

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return valid(iso[1]!, iso[2]!, iso[3]!);

  const slash = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(v);
  if (slash) {
    const month = slash[1]!;
    const day = slash[2]!;
    let year = slash[3]!;
    if (year.length === 2) {
      // A two digit year in a church directory is a birthday far more often
      // than a future date, so the window leans backwards.
      const n = Number(year);
      year = String(n > 30 ? 1900 + n : 2000 + n);
    }
    return valid(year, month.padStart(2, "0"), day.padStart(2, "0"));
  }

  // "12 March 1990" and "March 12, 1990" both land here.
  const parsed = Date.parse(v);
  if (!Number.isNaN(parsed) && /[a-z]{3}/i.test(v)) {
    const d = new Date(parsed);
    return valid(String(d.getUTCFullYear()), String(d.getUTCMonth() + 1).padStart(2, "0"), String(d.getUTCDate()).padStart(2, "0"));
  }

  return { error: "malformed" };
}

function valid(y: string, m: string, d: string): { value: string } | { error: "malformed" } {
  const month = Number(m);
  const day = Number(d);
  const year = Number(y);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2200) {
    return { error: "malformed" };
  }
  const iso = `${y}-${m}-${d}`;
  const check = new Date(`${iso}T00:00:00Z`);
  // Catches 31 February, which passes the range test and is not a date.
  if (Number.isNaN(check.getTime()) || check.getUTCDate() !== day) return { error: "malformed" };
  return { value: iso };
}

/** Maps whatever a church calls a status onto ours. Unknown values become visitor. */
export function parseLifecycle(raw: string): string {
  const n = normalise(raw);
  if (!n) return "visitor";
  if (/(^|\s)(member|active member|full member|covenant)/.test(n)) return "member";
  if (/regular|attender|attendee|adherent/.test(n)) return "regular_attender";
  if (/inactive|lapsed|former|moved/.test(n)) return "inactive";
  if (/deceased|died|deceased member/.test(n)) return "deceased";
  return "visitor";
}

export function parseHouseholdRole(raw: string): string {
  const n = normalise(raw);
  if (/head|primary|self|adult male|husband/.test(n)) return "head";
  if (/spouse|wife|partner|husband/.test(n)) return "spouse";
  if (/child|son|daughter|dependent|kid/.test(n)) return "child";
  return "other";
}

/**
 * R2.1. Marital status, from whatever word the file uses.
 *
 * A closed list in the product, so an import that cannot place a word leaves
 * the field empty rather than inventing a seventh answer nothing counts.
 */
export function parseMarital(raw: string): string | null {
  const n = normalise(raw);
  if (!n) return null;
  if (/^(m|married)$/.test(n) || n.includes("married")) return "married";
  if (n.includes("engaged")) return "engaged";
  if (n.includes("widow")) return "widowed";
  if (n.includes("divorc")) return "divorced";
  if (n.includes("separat")) return "separated";
  if (/^(s|single)$/.test(n) || n.includes("single") || n.includes("unmarried")) return "single";
  return null;
}

/** R2.1. School year, from "4th grade", "Grade 4", "4" and the rest of them. */
export function parseSchoolLevel(raw: string): string | null {
  const n = normalise(raw);
  if (!n) return null;
  if (/pre k|prek|preschool|pre school|nursery/.test(n)) return "pre_k";
  if (/kinder|^k$/.test(n)) return "kindergarten";
  if (/graduate|grad school|masters|phd/.test(n)) return "graduate";
  if (/college|university|undergrad/.test(n)) return "college";

  const grade = /(\d{1,2})/.exec(n);
  if (grade) {
    const year = Number(grade[1]);
    if (year >= 1 && year <= 12) return `grade_${year}`;
  }
  return null;
}

/** A column holding several values. "Worship; Small group" is two tags. */
export function splitValues(raw: string): string[] {
  return raw.split(/[;,|]/).map((v) => v.trim()).filter(Boolean);
}
