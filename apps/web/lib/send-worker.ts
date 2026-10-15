import "server-only";
import {
  dueSends, claimBatch, settle, noteRef, closeIfDone, reclaimStuck, accountFor, storeTokens,
  awaitingVerdict, recordVerdict,
  type DueSend, type Waiting,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { merge } from "@connectapp/ui";
import { markdownToHtml } from "@/lib/rich-text";
import {
  sendBySmtp, sendByResend, verdictFromResend, sender, type Message,
} from "@/lib/email-provider";
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
/**
 * R16.7. How long to leave between copies.
 *
 * Resend allows ten requests a second across a whole team, and a church that
 * trips it gets a refusal rather than a queue. A tenth of a second a copy
 * keeps a send comfortably under it, and six hundred an minute is far more
 * than any church of this size sends.
 */
const PACE = 100;

/**
 * R16.6, R24.11. How many churches a tick works through at once.
 *
 * Each has its own account and its own provider, so four of them running
 * alongside each other trips nothing: the limit Resend counts is per team, and
 * a team is a church. Four rather than forty because the tick also holds a
 * database connection a church.
 */
const CHURCHES_AT_ONCE = 4;

/**
 * R16.6. How long a tick works before it leaves the rest for the next one.
 *
 * The route gives itself 300 seconds. Stopping at 240 means a tick ends on its
 * own terms, with every copy either sent or back in the queue, rather than
 * being cut off mid-message and leaving rows claimed for the reclaim to find.
 */
const TICK_BUDGET_MS = 240_000;

const pause = (ms: number) => new Promise((go) => setTimeout(go, ms));

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
      /* R16.7. A mail server takes the message and says nothing more about
         it. Bounces come back to the church's own inbox, which is where a
         church using its own server already looks. */
      verdict: null,
    };
  }

  /* R16.1. The token this church already has, while it still has minutes on
     it. Refreshing on every pass is a rotation a minute, and two passes
     overlapping on a spent refresh token is how Resend revokes a grant. */
  let token = held.access;

  if (!token) {
    const clientId = resendClientId();
    if (!clientId) return null;

    const fresh = await refreshTokens(clientId, held.credential);
    if (!fresh.ok) {
      console.error("[send] the account could not be refreshed", fresh.said);
      return null;
    }

    await storeTokens(send.tenantId, {
      refresh: fresh.tokens.refreshToken,
      access: fresh.tokens.accessToken,
      seconds: fresh.tokens.expiresIn,
    });
    token = fresh.tokens.accessToken;
  }

  return {
    from,
    post: (message: Message) => sendByResend(token, message),
    verdict: (ref: string) => verdictFromResend(token, ref),
  };
}

/**
 * R16.6. One pass: take what is waiting and attempt it.
 *
 * Bounded rather than exhaustive, so the pass always ends inside a request's
 * life. What is left over is still a row waiting its turn, and the next pass
 * takes it.
 */
export async function drain(passes = 8): Promise<{ attempted: number }> {
  const until = Date.now() + TICK_BUDGET_MS;

  /*
   * R16.6. Anything a previous pass claimed and never finished, put right
   * before claiming more. A pass that ran out of time left its remainder
   * marked 'sending', where the due-sends count could not see it, so the rest
   * of that church's message waited on this.
   */
  const recovered = await reclaimStuck();
  if (recovered.requeued > 0 || recovered.finished > 0) {
    console.info(
      `[send] ${recovered.requeued} copies back in the queue, ${recovered.finished} already gone`,
    );
  }

  /*
   * R16.6, R24.11. The churches with something waiting, taken a few at a time.
   *
   * One tick used to work through them in turn, and a church sending to four
   * hundred people held the whole queue while it did: at a tenth of a second a
   * copy, forty seconds in which a church of sixty waiting behind it sent
   * nothing. With a thousand churches on one deployment that is a Saturday
   * where the last church's message goes out on Sunday.
   *
   * The pace stays where it is, because it belongs to one church's own account
   * and its provider's limit. What runs alongside is another church, through
   * another account, which no limit anywhere is counting together.
   */
  const waiting = await dueSends();
  let attempted = 0;

  const next = async (): Promise<void> => {
    for (;;) {
      const send = waiting.shift();
      if (!send || Date.now() >= until) return;
      attempted += await drainOne(send, passes, until);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CHURCHES_AT_ONCE, waiting.length) }, next),
  );

  return { attempted };
}

/** One church's send, to the end of it or to the end of this tick. */
async function drainOne(send: DueSend, passes: number, until: number): Promise<number> {
  const account = await readyAccount(send);
  let attempted = 0;

  for (let pass = 0; pass < passes; pass += 1) {
    const batch = await claimBatch(send.id);
    if (batch.length === 0) break;

    for (const person of batch) {
      if (!account) {
        await settle(person.id, { ok: false, said: t("send.notConnected") });
        continue;
      }

      const proof = await account.post(copyFor(send, person, account.from));
      if (proof.ok) await noteRef(person.id, proof.ref ?? null);

      await settle(person.id, {
        ok: proof.ok,
        said: proof.ok ? null : proof.said,
        again: proof.ok ? false : proof.again,
      });
      attempted += 1;

      /* Out of time. What is left is a row still waiting its turn, and the
         next tick takes it: the copies this pass claimed and did not reach go
         back through reclaimStuck. */
      if (Date.now() >= until) return attempted;

      await pause(PACE);
    }

    /* Checked after each pass rather than only at the end, so a send that
       finished says so even if this invocation is cut short on the next. */
    if (await closeIfDone(send.id)) break;
  }

  return attempted;
}

/**
 * HRT-142, R16.7. What became of the copies a provider accepted.
 *
 * Accepting a message is not delivering it. The provider tries the other side
 * minutes later, finds there is nobody at that address, and says so only if
 * asked. A church that is never told keeps writing to a dead address for
 * years, which is how its other mail starts landing in spam folders.
 *
 * A bounce marks the address on the person's own record, so the office sees
 * it beside their name rather than wondering why they never hear back.
 */
export async function checkVerdicts(limit = 60): Promise<{ looked: number; asked: number }> {
  const waiting = await awaitingVerdict(limit);
  let asked = 0;

  /* One account a church rather than one an address: a send of four hundred
     is four hundred questions to the same account. */
  const accounts = new Map<string, Awaited<ReturnType<typeof readyAccount>>>();

  for (const copy of waiting) {
    if (!accounts.has(copy.tenantId)) {
      accounts.set(
        copy.tenantId,
        await readyAccount({
          id: "",
          tenantId: copy.tenantId,
          subject: "",
          body: "",
          churchName: "",
          postal: "",
          origin: "",
          waiting: 0,
        }),
      );
    }

    const account = accounts.get(copy.tenantId);
    if (!account?.verdict) continue;

    const verdict = await account.verdict(copy.providerRef);
    if (verdict === "unknown" || verdict === "sent") continue;

    await recordVerdict(copy.id, verdict);
    asked += 1;
    await pause(PACE);
  }

  return { looked: waiting.length, asked };
}
