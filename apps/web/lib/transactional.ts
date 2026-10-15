import "server-only";
import {
  withTenant,
  emailCredentialForSend, rotateEmailCredential, markEmailTrouble,
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

    const fresh = await refreshTokens(clientId, held.credential);
    if (!fresh.ok) return fresh;

    await withTenant(ctx, (tx) =>
      rotateEmailCredential(tx, actor, {
        providerId: held.providerId,
        credential: fresh.tokens.refreshToken,
      }),
    );

    return sendByResend(fresh.tokens.accessToken, whole);
  })();

  /* R16.1. What the provider last said, kept for the email screen, so a key
     that has been revoked is read there rather than guessed at. */
  await withTenant(ctx, (tx) =>
    markEmailTrouble(tx, actor, { providerId: held.providerId, said: proof.ok ? null : proof.said }),
  );

  return proof.ok ? { ok: true } : { ok: false, connected: true, said: proof.said };
}
