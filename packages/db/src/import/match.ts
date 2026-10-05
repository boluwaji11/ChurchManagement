import { isNull } from "drizzle-orm";
import type { MessageKey } from "@connectapp/i18n";
import type { Tx } from "../client";
import { members, contactMethods } from "../schema/members";

/**
 * R2.8. Duplicate detection, on create and on import.
 *
 * The acceptance criterion is recall: a file of 500 members containing 40 known
 * duplicates must surface at least 38. So the rules lean towards finding a
 * match and letting a person decide, rather than towards being certain and
 * letting forty duplicates through.
 *
 * Confidence is reported rather than acted on. "Same email address" and "same
 * name, nothing else" are both matches, and only one of them should ever be
 * merged without somebody looking.
 */

export type Confidence = "certain" | "likely" | "possible";

export interface Candidate {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
}

export interface Match {
  memberId: string;
  displayName: string;
  confidence: Confidence;
  /** The catalogue key naming why, so the reason is shown in the reader's language. */
  reason: MessageKey;
}

/** An index of the church, built once and reused for every row of a file. */
export interface MatchIndex {
  byEmail: Map<string, ExistingPerson[]>;
  byPhone: Map<string, ExistingPerson[]>;
  byName: Map<string, ExistingPerson[]>;
  all: ExistingPerson[];
}

export interface ExistingPerson {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: string | null;
  emails: string[];
  phones: string[];
}

/** Lowercase, unaccented, punctuation removed. "O'Brien" and "OBrien" are one name. */
export const normaliseName = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

export const normaliseEmail = (value: string): string => value.trim().toLowerCase();

/**
 * The last ten digits. A church directory holds "(512) 555-0148",
 * "512.555.0148" and "+1 512 555 0148" for the same phone, and the country code
 * is the part most likely to be missing.
 */
export const normalisePhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const nameKey = (first: string, last: string) => `${normaliseName(first)}|${normaliseName(last)}`;

/**
 * Loads the church once.
 *
 * A row-by-row query would be correct and would also mean 500 round trips for a
 * 500 row file. The target is churches of 50 to 500 members and the ceiling is a
 * few thousand, so the whole directory fits in memory comfortably. If that ever
 * stops being true, this is the one function to change.
 */
export async function buildMatchIndex(db: Tx): Promise<MatchIndex> {
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
      dateOfBirth: members.dateOfBirth,
    })
    .from(members)
    .where(isNull(members.archivedAt));

  // Two plain queries rather than an aggregate subquery. array_agg came back
  // from the driver as the literal string "{a,b}", and a string is iterable, so
  // the index filled up with single characters and matched nothing. Two queries
  // and a join in memory cannot do that.
  const contacts = await db
    .select({ memberId: contactMethods.memberId, kind: contactMethods.kind, value: contactMethods.value })
    .from(contactMethods);

  const emails = new Map<string, string[]>();
  const phones = new Map<string, string[]>();
  for (const c of contacts) {
    const into = c.kind === "email" ? emails : phones;
    const list = into.get(c.memberId);
    if (list) list.push(c.value);
    else into.set(c.memberId, [c.value]);
  }

  return indexPeople(
    rows.map((r) => ({
      ...r,
      emails: emails.get(r.id) ?? [],
      phones: phones.get(r.id) ?? [],
    })),
  );
}

/**
 * Builds the index from rows already in hand.
 *
 * Separate from the query so the matching rules can be exercised against
 * hundreds of members without hundreds of round trips, which is what the R2.8
 * acceptance criterion needs.
 */
export function indexPeople(rows: ExistingPerson[]): MatchIndex {
  const index: MatchIndex = { byEmail: new Map(), byPhone: new Map(), byName: new Map(), all: [] };

  for (const person of rows) {
    index.all.push(person);
    for (const e of person.emails) push(index.byEmail, normaliseEmail(e), person);
    for (const p of person.phones) push(index.byPhone, normalisePhone(p), person);
    push(index.byName, nameKey(person.firstName, person.lastName), person);
    if (person.preferredName) push(index.byName, nameKey(person.preferredName, person.lastName), person);
  }

  return index;
}

function push(map: Map<string, ExistingPerson[]>, key: string, value: ExistingPerson): void {
  if (!key) return;
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

const display = (p: ExistingPerson) => `${p.preferredName ?? p.firstName} ${p.lastName}`;

/**
 * Every existing person this candidate might already be, strongest first.
 *
 * An email address is the closest thing a church directory has to an identifier,
 * so it is certain. A phone can be a household landline shared by five members,
 * so on its own it is only likely. A name plus a date of birth is certain; a name
 * on its own is possible, and there really are two Mary Smiths.
 */
export function findMatches(index: MatchIndex, candidate: Candidate): Match[] {
  const found = new Map<string, Match>();
  const add = (person: ExistingPerson, confidence: Confidence, reason: MessageKey) => {
    const existing = found.get(person.id);
    const rank = { certain: 3, likely: 2, possible: 1 };
    if (existing && rank[existing.confidence] >= rank[confidence]) return;
    found.set(person.id, { memberId: person.id, displayName: display(person), confidence, reason });
  };

  const first = (candidate.firstName ?? "").trim();
  const last = (candidate.lastName ?? "").trim();

  if (candidate.email) {
    for (const p of index.byEmail.get(normaliseEmail(candidate.email)) ?? []) {
      add(p, "certain", "import.match.email");
    }
  }

  if (first && last) {
    const sameName = index.byName.get(nameKey(first, last)) ?? [];
    for (const p of sameName) {
      if (candidate.dateOfBirth && p.dateOfBirth === candidate.dateOfBirth) {
        add(p, "certain", "import.match.nameAndBirth");
      } else if (candidate.phone && p.phones.some((x) => normalisePhone(x) === normalisePhone(candidate.phone!))) {
        add(p, "certain", "import.match.nameAndPhone");
      } else if (candidate.dateOfBirth && p.dateOfBirth && p.dateOfBirth !== candidate.dateOfBirth) {
        // Same name, different birthday. Two members, not one.
      } else {
        add(p, "possible", "import.match.name");
      }
    }
  }

  if (candidate.phone) {
    const key = normalisePhone(candidate.phone);
    if (key.length >= 7) {
      for (const p of index.byPhone.get(key) ?? []) {
        // A shared household line is common, so a phone plus a matching surname
        // is a person and a phone on its own is a household.
        const sameSurname = last && normaliseName(p.lastName) === normaliseName(last);
        add(p, sameSurname ? "likely" : "possible", sameSurname ? "import.match.phoneAndSurname" : "import.match.phone");
      }
    }
  }

  const rank = { certain: 3, likely: 2, possible: 1 };
  return [...found.values()].sort((a, b) => rank[b.confidence] - rank[a.confidence]);
}

/** Adds a person to the index, so a file containing the same person twice is caught. */
export function indexNewPerson(
  index: MatchIndex,
  person: { id: string; firstName: string; lastName: string; dateOfBirth?: string | null; email?: string | null; phone?: string | null },
): void {
  const entry: ExistingPerson = {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    preferredName: null,
    dateOfBirth: person.dateOfBirth ?? null,
    emails: person.email ? [person.email] : [],
    phones: person.phone ? [person.phone] : [],
  };
  index.all.push(entry);
  if (person.email) push(index.byEmail, normaliseEmail(person.email), entry);
  if (person.phone) push(index.byPhone, normalisePhone(person.phone), entry);
  push(index.byName, nameKey(person.firstName, person.lastName), entry);
}
