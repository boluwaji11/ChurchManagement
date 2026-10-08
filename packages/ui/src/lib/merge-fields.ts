/**
 * R16.12. The marks a church writes into a letter that become each
 * household's own words.
 *
 * Six of them, not a field browser. A church writing to its congregation says
 * the family's name, where they live and who it is from, and every merge
 * system that offered more than that ended up with volunteers pasting a field
 * name into a sentence and posting it.
 *
 * Unknown marks are left exactly as typed. A letter that says
 * "{nickname}" is a letter somebody can see is wrong before it goes in the
 * envelope; one where the mark has silently vanished is a letter that reads
 * fine and means something else.
 */

export const MERGE_FIELDS = [
  "name",
  "address",
  "church",
  "date",
  "today",
  "from",
] as const;

export type MergeField = (typeof MERGE_FIELDS)[number];

export type MergeValues = Partial<Record<MergeField, string>>;

/** `{name}`, and nothing else. A brace with a space in it is just a brace. */
const MARK = /\{([a-z]+)\}/g;

/**
 * R16.12. One letter's worth of words put into the template.
 *
 * The replacement is done in a single pass, so a value that happens to
 * contain a mark cannot be read as one: a household called "{church}" gets
 * posted to under that name rather than under the church's.
 */
export function merge(template: string, values: MergeValues): string {
  return template.replace(MARK, (whole, key: string) => {
    const held = (values as Record<string, string | undefined>)[key];
    return held === undefined ? whole : held;
  });
}

/** Which marks a template uses, in the order they first appear. */
export function marksIn(template: string): string[] {
  const seen: string[] = [];
  for (const [, key] of template.matchAll(MARK)) {
    if (key && !seen.includes(key)) seen.push(key);
  }
  return seen;
}

/** Which of those marks this product does not know, so a church is told. */
export function unknownMarks(template: string): string[] {
  return marksIn(template).filter(
    (one) => !(MERGE_FIELDS as readonly string[]).includes(one),
  );
}
