import "server-only";
import {
  dueSends, claimBatch, settle, closeIfDone, accountFor, rotateCredentialAsOwner,
  type DueSend, type Waiting,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { merge } from "@connectapp/ui";
import { markdownToHtml } from "@/lib/rich-text";
import { sendBySmtp, sendByResend, sender, type Message } from "@/lib/email-provider";
import type { SmtpSettings } from "@connectapp/db";
import { resendClientId, refreshTokens } from "@/lib/resend-oauth";

/**
 * HRT-141, R16.6. The worker behind a send.
 *
 * A church presses send on four hundred people and closes the laptop. The
 * copies are already written down as rows waiting their turn, and this takes
 * them a batch at a time until none are left. It runs on a schedule and is
 * also kicked the moment a send is queued, so a message to three people still
 * arrives while somebody is looking at the screen.
 *
 * This is the only place a church's credential is ever in the clear.
 */

/** Nothing a church typed reaches the markup as markup. */
const safe = (raw: string): string =>
  raw.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** R16.8. The fine print under every message. */
function footer(input: { address: string; wayOut: string; church: string; postal: string }): string {
  const lines = [
    t("send.foot.sentTo", { address: safe(input.address) }),
    `<a href="${input.wayOut}" style="color:#6b7280">${t("send.wayOut.word")}</a>`,
    [safe(input.church), input.postal ? safe(input.postal) : null].filter(Boolean).join(" · "),
  ];

  return (
    `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;` +
    `text-align:center;font-family:system-ui,sans-serif;font-size:12px;` +
    `line-height:1.7;color:#6b7280">` +
    lines.map((one) => `<div>${one}</div>`).join("") +
    `</div>`
  );
}

/** One person's copy, with their own name in it and their own way out. */
function copyFor(send: DueSend, person: Waiting, from: string): Message {
  const marks = { first: person.first, name: person.name, church: send.churchName };
  const words = merge(send.body, marks);
  const wayOut = person.token ? `${send.origin}/u/${person.token}` : send.origin;

  return {
    from,
    to: person.address,
    subject: merge(send.subject, marks),
    text:
      `${words}\n\n---\n` +
      `${t("send.foot.sentTo", { address: person.address })}\n` +
      `${t("send.wayOut")} ${wayOut}\n` +
      [send.churchName, send.postal].filter(Boolean).join(" · "),
    html:
      markdownToHtml(words) +
      footer({
        address: person.address,
        wayOut,
        church: send.churchName,
        postal: send.postal,
      }),
  };
}

/**
 * R16.1. The account this send leaves through, ready to send.
 *
 * Resend's refresh token is rotated before a single copy goes, because Resend
 * refuses one used twice and a send that burned it halfway through would take
 * the church's whole connection with it.
 */
async function readyAccount(send: DueSend) {
  const held = await accountFor(send.tenantId);
  if (!held?.fromAddress) return null;

  const from = sender(held.fromName, held.fromAddress);

  if (held.vendor !== "resend") {
    const settings = held.settings as SmtpSettings | null;
    if (!settings) return null;
    return {
      from,
      post: (message: Message) =>
        sendBySmtp({ ...settings, password: held.credential }, message),
    };
  }

  const clientId = resendClientId();
  if (!clientId) return null;

  const fresh = await refreshTokens(clientId, held.credential);
  if (!fresh.ok) return null;

  await rotateCredentialAsOwner(send.tenantId, fresh.tokens.refreshToken);
  const token = fresh.tokens.accessToken;

  return { from, post: (message: Message) => sendByResend(token, message) };
}

/**
 * R16.6. One pass: take what is waiting and attempt it.
 *
 * Bounded rather than exhaustive, so the pass always ends inside a request's
 * life. What is left over is still a row waiting its turn, and the next pass
 * takes it.
 */
export async function drain(passes = 8): Promise<{ attempted: number }> {
  let attempted = 0;

  for (const send of await dueSends()) {
    const account = await readyAccount(send);

    for (let pass = 0; pass < passes; pass += 1) {
      const batch = await claimBatch(send.id);
      if (batch.length === 0) break;

      for (const person of batch) {
        if (!account) {
          await settle(person.id, { ok: false, said: t("send.notConnected") });
          continue;
        }

        const proof = await account.post(copyFor(send, person, account.from));
        await settle(person.id, { ok: proof.ok, said: proof.ok ? null : proof.said });
        attempted += 1;
      }
    }

    await closeIfDone(send.id);
  }

  return { attempted };
}
