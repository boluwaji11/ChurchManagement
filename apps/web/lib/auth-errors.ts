import { t } from "@connectapp/i18n";

/**
 * What a sign-in provider said, in words the person can act on.
 *
 * Supabase answers in its own vocabulary: "email rate limit exceeded", "User
 * already registered", "Password should be at least 6 characters". Those are
 * messages to an engineer about an API. The person signing in is told what
 * happened and what to do next, and the original goes to the log.
 */
const KNOWN: { match: RegExp; key: string; field?: string }[] = [
  { match: /rate limit|too many requests|429/i, key: "auth.error.rateLimit" },
  {
    match: /already registered|already exists|user_already_exists/i,
    key: "auth.error.taken",
    field: "email",
  },
  /* Two different complaints about a password, and only one is about its
     length. Telling somebody with a long guessable password to make it
     longer is advice that cannot work. */
  {
    match: /password.*(known|weak|easy to guess|compromised|breach)/i,
    key: "auth.error.weakPassword",
    field: "password",
  },
  { match: /password.*(at least|short|length)/i, key: "auth.error.shortPassword", field: "password" },
  { match: /invalid.*email|email.*invalid/i, key: "auth.error.email", field: "email" },
  { match: /email not confirmed/i, key: "auth.error.unconfirmed" },
  { match: /invalid login credentials/i, key: "signIn.error.noMatch" },
  { match: /expired|no longer valid/i, key: "auth.error.expiredLink" },
  { match: /signups? not allowed|disabled/i, key: "auth.error.closed" },
  /* The send hook refused or could not be reached, so Supabase made the
     account and could not tell anybody about it. Saying "that did not
     work" over a thing that half worked sends somebody round again. */
  {
    match: /sending (the )?(confirmation|recovery|magic ?link|invite)? ?email|email.*(hook|not sent)|error sending/i,
    key: "auth.error.noMail",
  },
];

/**
 * R1.7. The box the provider was talking about, where it was talking about one.
 *
 * "Use at least ten characters" in a banner over four boxes names none of
 * them, and the reader has to guess which one it means. A message about a
 * field belongs under that field, where the red outline says the same thing a
 * second time.
 */
export function authField(
  error: { message?: string } | string | null | undefined,
): string | null {
  const message = typeof error === "string" ? error : (error?.message ?? "");
  return KNOWN.find((row) => row.match.test(message))?.field ?? null;
}

export function explainAuth(error: { message?: string } | string | null | undefined): string {
  const message = typeof error === "string" ? error : (error?.message ?? "");
  const known = KNOWN.find((row) => row.match.test(message));
  if (known) return t(known.key as never);

  // Nothing recognised it. Say so plainly rather than handing over the
  // provider's sentence, and leave the original where an engineer will find it.
  console.error("[auth]", message);
  return t("auth.error.unknown");
}
