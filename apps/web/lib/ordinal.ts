import { t, type MessageKey } from "@connectapp/i18n";

const rules = new Intl.PluralRules(undefined, { type: "ordinal" });

/**
 * "1st", "2nd", "3rd", "4th", in whatever language this reader is in.
 *
 * The ending is a message rather than a letter pair in code, because which
 * endings a language has, and which number takes which, is the language's
 * business and not this function's.
 */
export function ordinal(n: number): string {
  return t(`ordinal.${rules.select(n)}` as MessageKey, { n: String(n) });
}
