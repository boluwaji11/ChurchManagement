/**
 * R8.6. The security code on a label pair.
 *
 * The code is the thing standing between a child and the wrong adult, so the
 * rules it has to meet are worth stating plainly.
 *
 * It does not count up. A code that is one more than the family before it tells
 * anybody standing in the queue what the next one will be, and somebody who
 * knows the next one can collect a child who is not theirs.
 *
 * The alphabet leaves out every character a tired volunteer reads wrong at
 * 09:58: no O beside 0, no I or L beside 1, no S beside 5. What is on the label
 * is what gets typed.
 *
 * Five characters from twenty-eight is about seventeen million codes, which a
 * church of five hundred would take a thousand years to exhaust. They are
 * unique for a church and are never handed out twice, which is stronger than
 * the twelve months the requirement asks for and simpler to be sure of.
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
