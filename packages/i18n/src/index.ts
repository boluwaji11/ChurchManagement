import { en } from "./messages/en";
import { toAmerican, type Spelling } from "./spelling";

/**
 * R22.8. Every user-facing string lives in a catalogue, from the first commit,
 * even though v1 ships English only.
 *
 * This is not a translation feature. It is the thing that makes translation
 * possible later without reading every file in the product, and it has to be
 * done from the start because the cost of retrofitting it is proportional to the
 * number of screens.
 *
 * Deliberately not a framework. No locale routing, no middleware, no build step.
 * v1 has one locale, and the middleware on this product is the authentication
 * path, which is not somewhere to add moving parts for a feature nobody uses
 * yet. What this does give is the part that is expensive to add later: every
 * string in one file, and a key that does not exist failing to compile.
 */

export type Messages = typeof en;
export type MessageKey = keyof Messages;

/** Values interpolated into a message, as {name} in the catalogue. */
export type Params = Record<string, string | number>;

const CATALOGUES = { en } as const;
export type Locale = keyof typeof CATALOGUES;

export const DEFAULT_LOCALE: Locale = "en";

/** The locales that have a complete catalogue. */
export const LOCALES = Object.keys(CATALOGUES) as Locale[];

/**
 * R22.8. Which spelling this reader gets, asked at the moment a string is read.
 *
 * The host answers, because only the host knows whose church is on screen and
 * only the host has a per-request store to keep it in. This package stays free
 * of the framework: it holds a function, calls it, and falls back to the
 * spelling the catalogue is written in.
 *
 * Registered once, where the application starts. A `t()` that runs before then,
 * such as a constant built at module scope, gets British, which is what the
 * catalogue says and is wrong for nobody in a way anybody notices: the words
 * that differ are not the ones in a date picker's buttons.
 */
let resolver: (() => Spelling) | null = null;

export function setSpellingResolver(next: (() => Spelling) | null): void {
  resolver = next;
}

function spoken(text: string): string {
  if (!resolver) return text;
  try {
    return resolver() === "american" ? toAmerican(text) : text;
  } catch {
    // A resolver that cannot answer, such as one reaching for a request store
    // outside a request, leaves the words as written.
    return text;
  }
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    // A missing value renders the placeholder rather than "undefined", so a bug
    // in a message looks like a bug rather than like a sentence about nothing.
    return value === undefined ? whole : String(value);
  });
}

/**
 * Looks up a message and fills in its values.
 *
 * The key is typed against the catalogue, so a typo or a renamed key is a
 * compile error rather than a blank space on a screen a pastor is looking at.
 */
export function t(key: MessageKey, params?: Params, locale: Locale = DEFAULT_LOCALE): string {
  const catalogue = CATALOGUES[locale] ?? en;
  // A key the catalogue does not hold renders as the key. The type makes that
  // unreachable in a build that compiles, and a half-saved file in development
  // used to put an empty button on the screen instead of saying why.
  return spoken(interpolate(catalogue[key] ?? en[key] ?? key, params));
}

/**
 * The plural form of a message, chosen by the locale's own rules.
 *
 * The catalogue holds one key per category, suffixed `.one`, `.other` and so on.
 * Intl.PluralRules decides which, because English having two forms is a fact
 * about English rather than about counting, and Polish has four.
 *
 * `count` is always available to the message as {count}.
 */
export function plural(
  key: PluralKey,
  count: number,
  params?: Params,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const rule = new Intl.PluralRules(locale).select(count);
  const exact = `${key}.${rule}` as MessageKey;
  const fallback = `${key}.other` as MessageKey;
  const catalogue = CATALOGUES[locale] ?? en;
  const template = catalogue[exact] ?? catalogue[fallback] ?? en[fallback] ?? key;
  return spoken(interpolate(template, { count, ...params }));
}

type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * The stems that have plural forms, derived from the catalogue rather than
 * listed. Written through a generic because a conditional type only distributes
 * over a naked type parameter, and `MessageKey extends ...` on its own collapses
 * the whole union to never.
 */
type StemOf<K> = K extends `${infer Stem}.${PluralCategory}` ? Stem : never;
export type PluralKey = StemOf<MessageKey>;

export { en };
export * from "./spelling";
export * from "./regions";
