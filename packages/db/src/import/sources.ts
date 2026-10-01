import { PERSON_FIELDS, IGNORE } from "./columns";

/**
 * R19.5. The three systems a church is most likely to be leaving.
 *
 * A dedicated importer is not a different pipeline. It is knowing what a
 * Planning Center export calls a household before the volunteer has to work it
 * out: their file lands, the columns are already matched, and the screen that
 * confirms the mapping is the same screen as for any other spreadsheet.
 *
 * The mapping is a guess the person confirms, which is why a header these lists
 * do not know about costs nothing. The file is shown with the mapping before a
 * row is written, and the whole import can be rolled back for thirty days.
 */

export const SOURCE_KEYS = ["planning_center", "breeze", "churchtrac", "other"] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export interface ImportSource {
  key: SourceKey;
  /** The catalogue key for its name. */
  label: string;
  /**
   * Headers that together say the file came from this system. Lowercased, and
   * matched after the same normalising the generic guesser uses.
   */
  signature: string[];
  /** Their column name against our field, for the ones a guess gets wrong. */
  columns: Record<string, string>;
}

const normalise = (header: string): string =>
  header
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const IMPORT_SOURCES: ImportSource[] = [
  {
    key: "planning_center",
    label: "import.source.planning_center",
    // Their export is the only one of the three that ships a "Child" column and
    // names the household column "Household".
    signature: ["household", "membership"],
    columns: {
      "first name": "firstName",
      "last name": "lastName",
      nickname: "preferredName",
      birthdate: "dateOfBirth",
      // Membership is the one that says member or visitor. Status is active or
      // inactive, which is a different question, so it is left out rather than
      // turning every inactive person into a visitor.
      membership: "lifecycleStatus",
      email: "email",
      "mobile phone": "phone",
      household: "householdName",
      "household name": "householdName",
      "created at": IGNORE,
    },
  },
  {
    key: "breeze",
    label: "import.source.breeze",
    signature: ["family", "family role"],
    columns: {
      "first name": "firstName",
      "last name": "lastName",
      nickname: "preferredName",
      birthdate: "dateOfBirth",
      status: "lifecycleStatus",
      email: "email",
      mobile: "phone",
      family: "householdName",
      "family role": "householdRole",
      "joined date": "membershipDate",
      "breeze id": IGNORE,
    },
  },
  {
    key: "churchtrac",
    label: "import.source.churchtrac",
    signature: ["familyname", "memberstatus"],
    columns: {
      firstname: "firstName",
      lastname: "lastName",
      nickname: "preferredName",
      birthdate: "dateOfBirth",
      memberstatus: "lifecycleStatus",
      email: "email",
      cellphone: "phone",
      familyname: "householdName",
      familyposition: "householdRole",
      membershipdate: "membershipDate",
    },
  },
];

/**
 * Which system this file came from, or nothing.
 *
 * Every signature header has to be there. A file that only half matches is
 * treated as an unknown spreadsheet, because a wrong guess costs more than no
 * guess: somebody reading a mapping they half recognise stops reading.
 */
export function detectSource(headers: string[]): SourceKey | null {
  const seen = new Set(headers.map(normalise));
  const seenTight = new Set(headers.map((header) => normalise(header).replace(/\s/g, "")));

  for (const source of IMPORT_SOURCES) {
    const matches = source.signature.every(
      (header) => seen.has(header) || seenTight.has(header.replace(/\s/g, "")),
    );
    if (matches) return source.key;
  }
  return null;
}

/**
 * The mapping for a known system, over the generic guess.
 *
 * Only the columns this system names differently. Everything else falls through
 * to the guess, so a church that added its own column still gets it matched.
 */
export function sourceMapping(
  source: SourceKey,
  headers: string[],
  guessed: Record<string, string>,
): Record<string, string> {
  const known = IMPORT_SOURCES.find((row) => row.key === source);
  if (!known) return guessed;

  const mapping = { ...guessed };
  const fields = new Set(PERSON_FIELDS.map((field) => field.key));
  const claimed = new Set<string>();

  for (const header of headers) {
    const n = normalise(header);
    const tight = n.replace(/\s/g, "");
    const target = known.columns[n] ?? known.columns[tight];
    if (target === undefined) continue;
    if (target !== IGNORE && !fields.has(target)) continue;
    if (target !== IGNORE && claimed.has(target)) continue;

    mapping[header] = target;
    if (target !== IGNORE) claimed.add(target);
  }

  // A field the system's own mapping claimed must not also be held by a column
  // the generic guess picked up, or two columns write to one field.
  for (const header of headers) {
    const n = normalise(header);
    const tight = n.replace(/\s/g, "");
    const named = known.columns[n] ?? known.columns[tight];
    if (named !== undefined) continue;
    if (mapping[header] && claimed.has(mapping[header]!)) mapping[header] = IGNORE;
  }

  return mapping;
}
