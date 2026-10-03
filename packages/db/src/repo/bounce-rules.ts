/**
 * R16.7. Reading what a mail server said.
 *
 * Pure: no database, nothing that cannot be served to a browser, because the
 * same judgement is wanted on a screen and in the queue.
 *
 * SMTP answers in two families. A 5xx is the server saying this address does
 * not exist and never will, which is a hard bounce and the only kind worth
 * acting on. A 4xx is the server saying try later, and treating that as a dead
 * address would quietly throw away a message a church meant to send.
 */

export type Bounce = "hard" | "soft" | "unknown";

/** How many times a soft failure is tried before it is given up on. */
export const MAX_ATTEMPTS = 3;

const CODE = /\b([45])\d{2}\b/;

/**
 * The phrases that mean the address is wrong, for servers that answer in
 * sentences rather than codes. Deliberately short: guessing wrong here takes a
 * real person off a church's mailing list.
 */
const HARD_PHRASES = [
  "no such user",
  "no such mailbox",
  "no such address",
  "user unknown",
  "recipient address rejected",
  "does not exist",
  "mailbox unavailable",
  "invalid recipient",
  "address rejected",
];

const SOFT_PHRASES = [
  "try again",
  "temporarily",
  "temporary",
  "greylist",
  "rate limit",
  "too many",
  "quota exceeded",
  "mailbox full",
  "timeout",
  "connection",
];

/** R16.7. Hard, soft, or not something worth guessing at. */
export function classifyBounce(reason: string | null | undefined): Bounce {
  const said = (reason ?? "").toLowerCase();
  if (!said) return "unknown";

  // Soft is checked first: "mailbox full" carries a 5xx on some servers and is
  // still a mailbox that exists.
  if (SOFT_PHRASES.some((phrase) => said.includes(phrase))) return "soft";
  if (HARD_PHRASES.some((phrase) => said.includes(phrase))) return "hard";

  const code = CODE.exec(said)?.[1];
  if (code === "5") return "hard";
  if (code === "4") return "soft";
  return "unknown";
}

/**
 * R16.7. Whether this address is worth trying again.
 *
 * Unknown is treated as soft. A church would rather we tried twice more than
 * drop somebody because a mail server phrased its refusal oddly.
 */
export function shouldRetry(bounce: Bounce, attempts: number): boolean {
  if (bounce === "hard") return false;
  return attempts < MAX_ATTEMPTS;
}
