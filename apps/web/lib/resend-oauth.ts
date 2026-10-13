import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * HRT-288, R16.1. Connecting Resend without a church ever seeing a key.
 *
 * The church presses one button, lands on Resend's own consent screen, signs
 * in or signs up there, and comes back connected. Pasting an API key was the
 * same grant with a volunteer in the middle of it, and the middle is where a
 * church gives up.
 *
 * A public client with PKCE, which is what Resend issues through its own
 * registration endpoint: there is no client secret to keep, and the code that
 * comes back is worthless without the verifier that never left this server.
 */

const RESEND = "https://api.resend.com";

/**
 * R16.1. Full access, because it is the only scope that can create a domain.
 *
 * `emails:send` covers sending and nothing else, so a church granting it would
 * still have to go and make its own sending domain. The screen says what this
 * means before the press.
 */
const SCOPE = "full_access";

/** The client Resend issued us. Registered once per environment. */
export const resendClientId = (): string | null =>
  process.env["RESEND_OAUTH_CLIENT_ID"]?.trim() || null;

/** Base64url, which is what every value in this exchange is written in. */
const url64 = (raw: Buffer): string => raw.toString("base64url");

export interface Handshake {
  /** Kept on this server, and proves the code came back to whoever asked. */
  verifier: string;
  /** Goes out and comes back unchanged, and ties the answer to the request. */
  state: string;
}

export const startHandshake = (): Handshake => ({
  verifier: url64(randomBytes(64)),
  state: url64(randomBytes(24)),
});

/** Where the church is sent to say yes. */
export function authorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  verifier: string;
}): string {
  const challenge = url64(createHash("sha256").update(input.verifier).digest());
  const query = new URLSearchParams({
    client_id: input.clientId,
    response_type: "code",
    redirect_uri: input.redirectUri,
    scope: SCOPE,
    state: input.state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${RESEND}/oauth/authorize?${query.toString()}`;
}

export interface Tokens {
  accessToken: string;
  /**
   * R16.1. What the worker sends with, months from now.
   *
   * Resend rotates this on every use and refuses a token used twice, which
   * can revoke the whole grant, so whatever refreshes it writes the new one
   * back before it does anything else.
   */
  refreshToken: string;
}

/** The code the church came back with, turned into something we can use. */
export async function exchangeCode(input: {
  clientId: string;
  redirectUri: string;
  code: string;
  verifier: string;
}): Promise<{ ok: true; tokens: Tokens } | { ok: false; said: string }> {
  return token(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: input.clientId,
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.verifier,
    }),
  );
}

async function token(
  body: URLSearchParams,
): Promise<{ ok: true; tokens: Tokens } | { ok: false; said: string }> {
  try {
    const answer = await fetch(`${RESEND}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const held: unknown = await answer.json().catch(() => null);
    const read = (key: string): string =>
      typeof held === "object" && held !== null && key in held
        ? String((held as Record<string, unknown>)[key])
        : "";

    if (!answer.ok) {
      return {
        ok: false,
        said: (read("error_description") || read("error") || `${answer.status}`).slice(0, 300),
      };
    }

    const accessToken = read("access_token");
    const refreshToken = read("refresh_token");
    if (!accessToken || !refreshToken) return { ok: false, said: `${answer.status}` };

    return { ok: true, tokens: { accessToken, refreshToken } };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return { ok: false, said: raw.replace(/\s+/g, " ").trim().slice(0, 300) };
  }
}

/**
 * R16.1, R21.15. Handing the grant back when a church disconnects.
 *
 * Forgetting our copy is not the same as the church being free of us. The
 * grant is theirs to be rid of, so it is withdrawn at Resend as well, and a
 * failure here never stops the disconnect: the church asked to be
 * disconnected, and it is.
 */
export async function revokeGrant(clientId: string, refreshToken: string): Promise<void> {
  try {
    await fetch(`${RESEND}/oauth/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        token: refreshToken,
        token_type_hint: "refresh_token",
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    /* Already gone, or unreachable. Either way the church is disconnected. */
  }
}
