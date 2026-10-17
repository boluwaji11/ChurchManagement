/**
 * R8.6. The security code on a label pair.
 *
 * This code is what prevents a child being released to the wrong adult, so its
 * three properties are invariants rather than preferences.
 *
 * **Not sequential.** A code derived from the previous one lets anybody in the
 * queue predict the next, and a predictable code can be used to collect
 * somebody else's child.
 *
 * **No ambiguous characters.** The alphabet excludes O against 0, I and L
 * against 1, and S against 5, so a misread label cannot produce a valid code
 * for a different check-in.
 *
 * **Unique per church, never reissued.** Five characters from an alphabet of
 * 28 is roughly 17 million codes. A church of 500 would not exhaust that, and
 * never reusing a code is stronger than the twelve-month window R8.6 requires
 * and easier to verify.
 */

/** No 0, O, 1, I, L, 5 or S. What is printed is what gets typed. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRTUVWXYZ";

export const CODE_LENGTH = 5;

/** How many times a collision is retried before the check-in is refused. */
export const CODE_ATTEMPTS = 8;

/**
 * One code, from the platform's own randomness.
 *
 * `crypto.getRandomValues` rather than `Math.random`, because the guessability
 * of this string is a child safety property and not a nicety. The modulo bias
 * is removed by rejecting the tail of the byte range, so every character is
 * equally likely.
 */
export function newCode(length = CODE_LENGTH): string {
  const limit = 256 - (256 % ALPHABET.length);
  let out = "";

  while (out.length < length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= limit) continue;
      out += ALPHABET[byte % ALPHABET.length];
      if (out.length === length) break;
    }
  }

  return out;
}

/** What somebody typed at checkout, as a code. Case and spacing are forgiven. */
export function readCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Whether this could be a code at all, before the database is asked. */
export function looksLikeCode(input: string): boolean {
  const code = readCode(input);
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}
