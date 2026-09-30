/**
 * Small, shared validators so two forms cannot disagree about what a valid email
 * is, and so the messages stay in one voice.
 *
 * Messages say what is wrong and what to do about it. They never blame the
 * person, never shout, and never say "invalid".
 */
export type Validator = (value: string) => string | undefined;

export const requiredValue =
  (what: string): Validator =>
  (value) =>
    value.trim() ? undefined : `Enter ${what}.`;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const email: Validator = (value) => {
  const v = value.trim();
  if (!v) return "Enter your email address.";
  if (!EMAIL.test(v)) return "That does not look like an email address. Check for a typo.";
  return undefined;
};

export const minLength =
  (n: number, what = "This"): Validator =>
  (value) =>
    value.length >= n ? undefined : `${what} needs at least ${n} characters.`;

/** Runs validators in order and returns the first message, or undefined. */
export const check = (value: string, ...validators: Validator[]): string | undefined => {
  for (const v of validators) {
    const message = v(value);
    if (message) return message;
  }
  return undefined;
};
