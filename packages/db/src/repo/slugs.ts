import { formSlug } from "./form-rules";

/**
 * R24.6. A readable address that nothing else in this church is using.
 *
 * The caller says how to look for a clash, because the table differs and the
 * rest does not: slugify the words, and where that is taken, number it. Written
 * once when the record is created and kept through every rename, so a link
 * already sent out keeps working.
 */
export async function freeSlug(
  words: string,
  taken: (candidate: string) => Promise<boolean>,
  fallback = "item",
): Promise<string> {
  const base = formSlug(words) || fallback;
  for (let n = 1; n < 500; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
  // Five hundred of one name in one church is not a church, it is a loop.
  return `${base}-${Date.now().toString(36)}`;
}
