/**
 * R19.5. A file whose rows are memberships rather than members.
 *
 * Planning Center, Breeze and ChurchTrac all export group membership the same
 * shape: one line per person per group, with the group's name repeated down the
 * column. So this needs no per-system mapping the way members files do. The
 * aliases below cover what all three call these six things.
 */
import { IGNORE } from "./columns";

export interface GroupTargetField {
  key: string;
  /** The catalogue key for its name. */
  label: string;
  required?: boolean;
  aliases: string[];
}

export const GROUP_FIELDS: GroupTargetField[] = [
  { key: "groupName", label: "import.group.name", required: true,
    aliases: ["group", "group name", "groupname", "team", "team name", "class", "class name",
              "small group", "ministry", "event name"] },
  { key: "groupType", label: "import.group.type",
    aliases: ["group type", "grouptype", "type", "category", "group category"] },
  { key: "firstName", label: "personForm.firstName",
    aliases: ["first name", "firstname", "given name", "givenname", "first", "forename", "fname"] },
  { key: "lastName", label: "personForm.lastName",
    aliases: ["last name", "lastname", "surname", "family name", "familyname", "last", "lname"] },
  { key: "email", label: "personForm.email",
    aliases: ["email", "email address", "e mail", "primary email", "home email", "personal email"] },
  { key: "phone", label: "personForm.phone",
    aliases: ["phone", "phone number", "mobile", "mobile phone", "cell", "cell phone", "cellphone"] },
  { key: "role", label: "import.group.role",
    aliases: ["role", "group role", "grouprole", "position", "member type", "membership role",
              "team role", "leader"] },
  { key: "joinedOn", label: "import.group.joined",
    aliases: ["joined", "joined on", "joined at", "joined date", "date joined", "start date",
              "member since", "added on"] },
];

const normalise = (header: string): string =>
  header
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const NAME_ALIASES = new Set(GROUP_FIELDS.find((f) => f.key === "groupName")!.aliases);
const PERSON_ALIASES = new Set([
  ...GROUP_FIELDS.find((f) => f.key === "email")!.aliases,
  ...GROUP_FIELDS.find((f) => f.key === "lastName")!.aliases,
]);

/**
 * Whether this file is memberships rather than members.
 *
 * It needs a column naming the group and a column naming the person, because a
 * members export with a "Type" column is not a group file and reading it as one
 * would put the whole church into a group called "Member".
 */
export function isGroupSheet(headers: string[]): boolean {
  const seen = headers.map(normalise);
  const tight = seen.map((h) => h.replace(/\s/g, ""));
  const has = (set: Set<string>) =>
    seen.some((h) => set.has(h)) ||
    tight.some((h) => [...set].some((alias) => alias.replace(/\s/g, "") === h));
  return has(NAME_ALIASES) && has(PERSON_ALIASES);
}

/** The same two-pass guess the members importer uses, over the group fields. */
export function guessGroupMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const claimed = new Set<string>();

  const claim = (header: string, key: string) => {
    mapping[header] = key;
    claimed.add(key);
  };

  for (const header of headers) {
    const n = normalise(header);
    const tight = n.replace(/\s/g, "");
    const exact = GROUP_FIELDS.find(
      (f) =>
        !claimed.has(f.key) &&
        (f.aliases.includes(n) || f.aliases.some((a) => a.replace(/\s/g, "") === tight)),
    );
    if (exact) claim(header, exact.key);
  }

  for (const header of headers) {
    if (mapping[header]) continue;
    const n = normalise(header);
    const loose = GROUP_FIELDS.find(
      (f) =>
        !claimed.has(f.key) &&
        f.aliases.some((a) => n.includes(` ${a}`) || n.startsWith(`${a} `) || n.endsWith(` ${a}`)),
    );
    if (loose) claim(header, loose.key);
  }

  for (const header of headers) mapping[header] ??= IGNORE;
  return mapping;
}

/**
 * What a system calls somebody who runs the group, in our three words.
 *
 * A blank is a member, because the overwhelming majority of rows in any of these
 * files are ordinary members and the column is often only filled for leaders.
 */
export function parseGroupRole(raw: string): "leader" | "coleader" | "member" {
  const n = normalise(raw);
  if (!n) return "member";
  if (/co leader|coleader|assistant|deputy|apprentice|second/.test(n)) return "coleader";
  if (/leader|host|facilitator|teacher|coach|captain|director|^lead$/.test(n)) return "leader";
  if (/^(y|yes|true|1)$/.test(n)) return "leader";
  return "member";
}
