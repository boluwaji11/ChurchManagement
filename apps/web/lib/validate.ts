import { t } from "@connectapp/i18n";

/**
 * Shared validators, so two forms cannot disagree about what a valid email is.
 *
 * These live here rather than in @connectapp/ui because they are copy, and a design
 * system should not own the product's sentences. A Field renders a message; it
 * does not decide what the message says.
 *
 * Messages say what is wrong and what to do about it. They never blame the
 * person, never shout, and never say "invalid".
 */
export type Validator = (value: string) => string | undefined;

export const requiredValue =
  (what: string): Validator =>
  (value) =>
    value.trim() ? undefined : t("validate.required", { what });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const email: Validator = (value) => {
  const v = value.trim();
  if (!v) return t("validate.email.blank");
  if (!EMAIL.test(v)) return t("validate.email.malformed");
  return undefined;
};

export const minLength =
  (count: number, what: string): Validator =>
  (value) =>
    value.length >= count ? undefined : t("validate.minLength", { what, count });

/** Runs validators in order and returns the first message, or undefined. */
export const check = (value: string, ...validators: Validator[]): string | undefined => {
  for (const v of validators) {
    const message = v(value);
    if (message) return message;
  }
  return undefined;
};
