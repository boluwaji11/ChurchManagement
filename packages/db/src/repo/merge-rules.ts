/**
 * R16.4. Merge fields, as a rule rather than a query.
 *
 * Pure: no database, no node built-ins, nothing that cannot be served to a
 * browser. The composer previews on every keystroke, and a round trip to find
 * out that "Hi {{first_name}}" reads "Hi Ada" is a round trip too many.
 */

/** Every name a message may use. Anything else is left exactly as typed. */
export const MERGE_FIELDS = [
  "first_name", "last_name", "full_name", "email", "church",
] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];

export type MergeValues = Partial<Record<MergeField, string | null>>;

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  updatedAt: string;
}

export interface TemplateInput {
  name: string;
  subject: string;
  body: string;
}

const FIELD = /\{\{\s*([a-z_]+)\s*\}\}/g;
/**
 * R16.4. Puts one person's details into a message.
 *
 * Pure, and exported, because the composer previews on every keystroke and a
 * round trip for that is a round trip too many.
 *
 * A name the church does not recognise is left on the page as typed, so a
 * message mentioning `{{pledge_total}}` reads as a mistake somebody can see
 * rather than a silent gap.
 */
export function mergeInto(text: string, values: MergeValues): string {
  return text.replace(FIELD, (whole, name: string) => {
    if (!(MERGE_FIELDS as readonly string[]).includes(name)) return whole;
    const value = values[name as MergeField];
    return value ?? "";
  });
}

/** R16.4. Which merge fields a message uses, in the order they first appear. */
export function fieldsUsed(text: string): MergeField[] {
  const out: MergeField[] = [];
  for (const match of text.matchAll(FIELD)) {
    const name = match[1] as MergeField;
    if ((MERGE_FIELDS as readonly string[]).includes(name) && !out.includes(name)) {
      out.push(name);
    }
  }
  return out;
}

/** R16.4. Names in a message that no church record can fill. */
export function unknownFields(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(FIELD)) {
    const name = match[1]!;
    if (!(MERGE_FIELDS as readonly string[]).includes(name) && !out.includes(name)) {
      out.push(name);
    }
  }
  return out;
}

/**
 * R16.5. The kinds of group a message can be addressed to.
 *
 * Here with the merge fields because the picker is a client component and this
 * is the list it draws. Giving status is held back to 0.3 with the money.
 */
export const AUDIENCE_KINDS = [
  "everybody", "list", "group", "team", "pipeline", "tag", "status",
] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];

export interface AudienceChoice {
  kind: AudienceKind;
  /** The list, group, team, pipeline or tag. A lifecycle status, for "status". */
  id?: string | null;
}
