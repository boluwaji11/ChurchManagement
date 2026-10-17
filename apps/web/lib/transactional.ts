import "server-only";
import {
  withTenant,
  emailCredentialForSend, storeTokens, markEmailTrouble, underGrantLock, accountFor,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { sendBySmtp, sendByResend, sender, type Message } from "@/lib/email-provider";
import { resendClientId, refreshTokens } from "@/lib/resend-oauth";
import type { Session } from "@/lib/session";

/**
 * HRT-370, R16.4, R21.15. One message to one address, as the church, now.
 *
 * The queue is for a composed send: a church writes once, four hundred copies
 * are written down, and the worker takes them a batch at a time with each
 * person's own way out in the footer. An invitation is none of that. It goes to
 * one address, the address is not a member yet and has agreed to nothing, it
 * carries no unsubscribe because leaving a mailing list is not a thing it is
 * on, and whoever pressed the button is sitting in front of the screen waiting
 * to be told whether it went.
 *
 * So it leaves here, the way the test email does, and this is the shape both of
 * them use: the credential is opened for the length of one send and the
 * provider's own verdict comes straight back to the press.
 *
 * Resend rotates its refresh token on every refresh and refuses one used twice,
 * which can take the whole grant with it, so the new one is written down before
 * the message goes. A send that fails costs a message; a token lost after a
 * crash costs the church its connection.
 */
export type Sent =
  /** It went, as far as the provider is concerned. */
  | { ok: true }
  /** R16.4. Nothing is connected to send through. */
  | { ok: false; connected: false }
  /** The account is there and refused this message, in its own words. */
  | { ok: false; connected: true; said: string };

export async function sendAsChurch(
  session: Pick<Session, "tenantId" | "role" | "userId" | "permissions">,
  message: Omit<Message, "from">,
): Promise<Sent> {
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const held = await withTenant(ctx, (tx) => emailCredentialForSend(tx, actor));
  if (!held?.fromAddress) return { ok: false, connected: false };

  const whole: Message = { ...message, from: sender(held.fromName, held.fromAddress) };

  const proof = await (async () => {
    if (held.vendor === "smtp") {
      if (!held.settings) return { ok: false as const, said: t("email.test.notConnected") };
      return sendBySmtp({ ...held.settings, password: held.credential }, whole);
    }

    const clientId = resendClientId();
    if (!clientId) return { ok: false as const, said: t("email.said.unconfigured") };

    /*
     * HRT-290, R16.1. The token this church already has, while it still has
     * minutes on it.
     *
     * Refreshing on every message is a rotation a message, and Resend issues
     * a new refresh token every time, refuses a spent one, and revokes the
     * whole grant when one is replayed. Two messages sent at the same moment
     * both read the same stored token, both refresh, and the slower of them
     * replays a spent one: the church's email stops, for every send, until
     * somebody connects Resend again. The worker has always done it this way;
     * this path did not.
     */
    let token = held.access;
    let said = "";

    if (!token) {
      /* HRT-387. One refresh at a time across the deployment, because the
         slower of two is the one that replays a spent token. */
      token = await underGrantLock(session.tenantId, async () => {
        /* Whoever we waited for has usually just refreshed, and what they
           wrote is the token to use rather than a reason to refresh again. */
        const now = await accountFor(session.tenantId);
        if (now?.access) return now.access;

        const fresh = await refreshTokens(clientId, now?.credential ?? held.credential);
        if (!fresh.ok) {
          said = fresh.said;
          return null;
        }

        /* Both halves of the exchange in one statement: a rotated refresh
           token written without its access token would be refreshed again
           next time for no reason, and an access token written without it
           would leave the spent one in the column. */
        await storeTokens(session.tenantId, {
          refresh: fresh.tokens.refreshToken,
          access: fresh.tokens.accessToken,
          seconds: fresh.tokens.expiresIn,
        });
        return fresh.tokens.accessToken;
      });
    }

    if (!token) return { ok: false as const, said: said || t("email.said.busy") };

    return sendByResend(token, whole);
  })();

  /* R16.1. What the provider last said, kept for the email screen, so a key
     that has been revoked is read there rather than guessed at. */
  await withTenant(ctx, (tx) =>
    markEmailTrouble(tx, actor, { providerId: held.providerId, said: proof.ok ? null : proof.said }),
  );

  return proof.ok ? { ok: true } : { ok: false, connected: true, said: proof.said };
}

/**
 * HRT-372, R16.4, R22.1. One message to one address, as ConnectApp.
 *
 * An invitation to join ConnectApp is the platform's own mail, not the
 * church's. It says that somebody has been given an account here, it carries
 * a link to our sign-in, and it goes to an address that is nobody's member
 * yet. Holding it until the church connects an account meant a church could
 * not get its second administrator in without first setting up email, which
 * is three steps further down the guide.
 *
 * This is what "the shared email quota is transactional only" is for. Mail a
 * church writes to its congregation still goes through the church's own
 * account, which is what `sendAsChurch` above is.
 */
export async function sendAsPlatform(message: Omit<Message, "from">): Promise<Sent> {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["PLATFORM_FROM_EMAIL"] ?? process.env["SUPPORT_FROM_EMAIL"];
  // A deployment with no platform account of its own, which is a laptop.
  if (!key || !from) return { ok: false, connected: false };

  const proof = await sendByResend(key, { ...message, from: sender(t("app.name"), from) });
  return proof.ok ? { ok: true } : { ok: false, connected: true, said: proof.said };
}
