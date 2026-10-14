"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant,
  emailRecipientsFor, findEmailRecipients, wayOutFor, startSend, recordDelivery, finishSend,
  emailCredentialForSend, rotateEmailCredential,
  type Audience,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { merge } from "@connectapp/ui";
import { markdownToHtml } from "@/lib/rich-text";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { churchOrigin } from "@/lib/church-address";
import { sendBySmtp, sendByResend, sender } from "@/lib/email-provider";
import { resendClientId, refreshTokens } from "@/lib/resend-oauth";

/**
 * HRT-139, HRT-143, R16.4, R16.6, R16.8. Sending one message to a church's people.
 *
 * Every copy carries the way out. That is not a line at the bottom of a
 * template somebody could delete: it is added here, to every message, and a
 * church cannot send one without it.
 *
 * Sent from the request rather than from a queue, because there is no queue
 * yet. That is the limit on this: a send is capped, and a church with
 * thousands waits for HRT-141. What is here works for the fifty to five
 * hundred this product is for.
 */

/** R16.6. As many as one request can carry while the church watches. */
const CAP = 500;

export interface SendResult {
  error?: string;
  delivered?: number;
  failed?: number;
}

async function context() {
  const session = await requireSession();
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    session,
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId },
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
      ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    },
  };
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/**
 * R16.4. How many this would reach, and a few of them by name.
 *
 * The count alone is not enough to catch the mistake that matters, which is
 * the right message going to the wrong list. Three addresses is enough for
 * somebody to recognise the audience, or to realise they have the whole
 * directory selected when they meant a group of eight.
 */
export interface Reach {
  count: number;
  sample: string[];
}

export async function countAudience(
  audience: Audience,
  audienceId: string | null,
  memberIds: string[] = [],
  addresses: string[] = [],
): Promise<Reach> {
  const { ctx } = await context();
  const people = await withTenant(ctx, (tx) =>
    emailRecipientsFor(tx, { audience, audienceId, memberIds, addresses }),
  );
  return { count: people.length, sample: people.slice(0, 3).map((one) => one.address) };
}

/** R16.4. People matching what the writer typed, for choosing them one by one. */
export async function findRecipients(query: string) {
  const { ctx } = await context();
  try {
    return await withTenant(ctx, (tx) => findEmailRecipients(tx, query));
  } catch {
    return [];
  }
}

export async function sendEmail(data: FormData): Promise<SendResult> {
  const { session, actor, ctx } = await context();

  const subject = field(data, "subject");
  const body = field(data, "body");
  if (!subject) return { error: t("send.error.subject") };
  if (!body) return { error: t("send.error.body") };

  const audience = (field(data, "audience") || "everyone") as Audience;
  const audienceId = field(data, "audienceId") || null;
  const audienceName = field(data, "audienceName") || null;
  const memberIds = field(data, "memberIds").split(",").filter(Boolean);
  const addresses = field(data, "addresses").split(",").filter(Boolean);

  try {
    const held = await withTenant(ctx, (tx) => emailCredentialForSend(tx, actor));
    if (!held?.fromAddress) return { error: t("email.test.notConnected") };

    const people = await withTenant(ctx, async (tx) => {
      const found = await emailRecipientsFor(tx, { audience, audienceId, memberIds, addresses });
      /* R16.8. Each person's own way out, minted once and kept, so a link in
         a message sent last year still works. */
      for (const one of found) {
        one.token = await wayOutFor(tx, actor, { memberId: one.memberId, address: one.address });
      }
      return found.slice(0, CAP);
    });

    if (people.length === 0) return { error: t("send.error.nobody") };

    const origin = (await churchOrigin(session.tenantSlug)) ?? "";
    const from = sender(held.fromName, held.fromAddress);

    /* R16.1. One access token for the whole send, and the refresh token it
       came with written down first: Resend refuses one used twice. */
    const access = await (async () => {
      if (held.vendor !== "resend") return null;
      const clientId = resendClientId();
      if (!clientId) return { error: t("email.said.unconfigured") };

      const fresh = await refreshTokens(clientId, held.credential);
      if (!fresh.ok) return { error: fresh.said };

      await withTenant(ctx, (tx) =>
        rotateEmailCredential(tx, actor, {
          providerId: held.providerId,
          credential: fresh.tokens.refreshToken,
        }),
      );
      return { token: fresh.tokens.accessToken };
    })();

    if (access && "error" in access) return { error: access.error };

    const sendId = await withTenant(ctx, (tx) =>
      startSend(tx, actor, {
        subject,
        body,
        audience,
        audienceId,
        audienceName,
        total: people.length,
      }),
    );

    for (const person of people) {
      const words = merge(body, {
        first: person.first,
        name: person.name,
        church: session.tenantName,
      });

      /* R16.8. The way out is a word rather than a line of random
         characters, which is what a church would write and what a reader
         will actually press. The plain copy keeps the whole address, because
         there is nothing to hang a word on. */
      const wayOut = `${origin}/u/${person.token}`;

      const message = {
        from,
        to: person.address,
        subject: merge(subject, {
          first: person.first,
          name: person.name,
          church: session.tenantName,
        }),
        text: `${words}\n\n---\n${t("send.wayOut")} ${wayOut}`,
        html:
          `${markdownToHtml(words)}` +
          `<hr style="margin:24px 0;border:0;border-top:1px solid #ddd">` +
          `<p style="font-size:13px;color:#666">${t("send.wayOut.before")} ` +
          `<a href="${wayOut}">${t("send.wayOut.word")}</a>.</p>`,
      };

      const sent = access
        ? await sendByResend(access.token, message)
        : await sendBySmtp({ ...held.settings!, password: held.credential }, message);

      await withTenant(ctx, (tx) =>
        recordDelivery(tx, actor, {
          sendId,
          memberId: person.memberId,
          address: person.address,
          ok: sent.ok,
          said: sent.ok ? null : sent.said,
        }),
      );
    }

    const tally = await withTenant(ctx, (tx) => finishSend(tx, actor, sendId));
    revalidatePath("/members/email");
    return tally;
  } catch (error) {
    return { error: explain(error) };
  }
}
