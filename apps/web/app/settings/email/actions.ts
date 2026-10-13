"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, apexOf, dnsResolver,
  connectEmailProvider, disconnectEmailProvider, emailProvider,
  sendingDomain, saveSendingDomain, markSendingDomain,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { proveSmtp, proveResend, resendDomain, recordsPublished } from "@/lib/email-provider";

/**
 * HRT-287, R16.1, R21.15. Connecting the account a church's email leaves through.
 *
 * Every one of these proves the connection before it writes it down, with the
 * credential the church typed in hand. Nothing here opens a stored one: a
 * church's mail password is sealed in its column and read by the worker that
 * sends, and a request path that could read it is a request path that could
 * leak it.
 */

export interface EmailResult {
  error?: string;
}

async function context() {
  const session = await requireSession();
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
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

const SHAPE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/** The address mail goes out as, which both vendors need and neither invents. */
function from(data: FormData): { name: string; address: string } | { error: string } {
  const address = field(data, "fromAddress").toLowerCase();
  if (!address) return { error: t("email.error.from") };
  if (!SHAPE.test(address)) return { error: t("email.error.fromShape") };
  return { name: field(data, "fromName"), address };
}

/** R16.1. A church's own mail server, proved by opening a session with it. */
export async function connectSmtp(data: FormData): Promise<EmailResult> {
  const { actor, ctx } = await context();

  const sender = from(data);
  if ("error" in sender) return { error: sender.error };

  const host = field(data, "host").toLowerCase();
  if (!host) return { error: t("email.error.host") };

  const port = Number(field(data, "port") || "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: t("email.error.port") };

  const settings = {
    host,
    port,
    /* 465 is encrypted from the first byte. 587 starts in the clear and raises
       STARTTLS, which nodemailer does on its own when `secure` is false. */
    secure: port === 465,
    username: field(data, "username"),
  };

  const proof = await proveSmtp({ ...settings, password: field(data, "password") });
  if (!proof.ok) return { error: proof.said };

  try {
    await withTenant(ctx, (tx) =>
      connectEmailProvider(tx, actor, {
        vendor: "smtp",
        credential: field(data, "password"),
        externalAccountId: settings.username || null,
        fromName: sender.name,
        fromAddress: sender.address,
        settings,
      }),
    );
    revalidatePath("/settings/email");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R16.1. Resend, and the church's own domain registered on it.
 *
 * The domain is the root of the address mail goes out as, so the signature
 * aligns with what a member reads in their inbox and DMARC passes on that
 * alignment. What Resend generates is written down in the same breath, because
 * a volunteer who closes this tab halfway through typing records into their
 * registrar has to come back to the same three values.
 */
export async function connectResend(data: FormData): Promise<EmailResult> {
  const { actor, ctx } = await context();

  const sender = from(data);
  if ("error" in sender) return { error: sender.error };

  const key = field(data, "key");
  const proof = await proveResend(key);
  if (!proof.ok) return { error: proof.said };

  const root = apexOf(sender.address.split("@")[1] ?? "");
  if (!root) return { error: t("email.error.noDomain") };

  const made = await resendDomain(key, root);
  if (!made.ok) return { error: made.said };

  try {
    await withTenant(ctx, async (tx) => {
      const providerId = await connectEmailProvider(tx, actor, {
        vendor: "resend",
        credential: key,
        externalAccountId: made.domain.id,
        fromName: sender.name,
        fromAddress: sender.address,
        settings: null,
      });
      await saveSendingDomain(tx, actor, {
        providerId,
        domain: made.domain.name,
        records: made.domain.records,
      });
    });
    revalidatePath("/settings/email");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R16.1. Whether the records are published, read from public DNS.
 *
 * Public DNS is what every mail server on the internet reads before it
 * delivers, and it needs no credential, so the question a church keeps coming
 * back to this screen for is answered without opening anything sealed.
 */
export async function checkRecords(): Promise<EmailResult> {
  const { actor, ctx } = await context();

  try {
    const held = await withTenant(ctx, (tx) => sendingDomain(tx));
    if (!held) return {};

    const seen = await recordsPublished(held.records, dnsResolver());
    const missing = seen.filter((one) => !one.found);

    await withTenant(ctx, (tx) =>
      markSendingDomain(tx, actor, {
        id: held.id,
        state: missing.length === 0 ? "verified" : "pending",
        failureReason: null,
      }),
    );
    revalidatePath("/settings/email");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R16.1, R21.15. Taking the connection off, and the password with it. */
export async function disconnectEmail(): Promise<EmailResult> {
  const { actor, ctx } = await context();
  try {
    await withTenant(ctx, async (tx) => {
      if (await emailProvider(tx)) await disconnectEmailProvider(tx, actor);
    });
    revalidatePath("/settings/email");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
