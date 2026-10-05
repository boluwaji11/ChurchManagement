import { t } from "@connectapp/i18n";

/**
 * What a sign-in provider said, in words the person can act on.
 *
 * Supabase answers in its own vocabulary: "email rate limit exceeded", "User
 * already registered", "Password should be at least 6 characters". Those are
 * messages to an engineer about an API. Maria gets told what happened and what
 * to do next, and the original goes to the log.
 */
const KNOWN: { match: RegExp; key: string }[] = [
  { match: /rate limit|too many requests|429/i, key: "auth.error.rateLimit" },
  { match: /already registered|already exists|user_already_exists/i, key: "auth.error.taken" },
  { match: /password.*(at least|short|weak)/i, key: "auth.error.weakPassword" },
  { match: /invalid.*email|email.*invalid/i, key: "auth.error.email" },
  { match: /email not confirmed/i, key: "auth.error.unconfirmed" },
  { match: /invalid login credentials/i, key: "signIn.error.noMatch" },
  { match: /expired|no longer valid/i, key: "auth.error.expiredLink" },
  { match: /signups? not allowed|disabled/i, key: "auth.error.closed" },
];

export function explainAuth(error: { message?: string } | string | null | undefined): string {
  const message = typeof error === "string" ? error : (error?.message ?? "");
  const known = KNOWN.find((row) => row.match.test(message));
  if (known) return t(known.key as never);

  // Nothing recognised it. Say so plainly rather than handing over the
  // provider's sentence, and leave the original where an engineer will find it.
  console.error("[auth]", message);
  return t("auth.error.unknown");
}
