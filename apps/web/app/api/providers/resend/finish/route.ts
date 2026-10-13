import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  withTenant, apexOf, canManageChurch,
  connectEmailProvider, saveSendingDomain,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { exchangeCode, resendClientId } from "@/lib/resend-oauth";
import { resendDomain } from "@/lib/email-provider";
import { redirectUri } from "../hop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRUMBS = ["resend_verifier", "resend_state", "resend_from", "resend_name"] as const;

/**
 * HRT-288, R16.1, R21.15. Back from Resend, connected.
 *
 * Everything a church would have had to do by hand happens here: the code
 * becomes a token, the root of the address it sends from becomes a domain on
 * its own Resend account, and the records that domain needs are written down
 * so the screen can show them. The church pressed one button and said yes.
 */
export async function GET(request: Request) {
  const session = await requireSession();
  const back = new URL("/settings/email", request.url);
  const asked = new URL(request.url);

  const jar = await cookies();
  const forget = (answer: NextResponse) => {
    for (const crumb of CRUMBS) answer.cookies.delete(crumb);
    return answer;
  };
  const refuse = (why: string) => {
    back.searchParams.set("resend", why);
    return forget(NextResponse.redirect(back));
  };

  if (!canManageChurch(session)) return forget(NextResponse.redirect(back));

  /* The church pressed No on Resend's own screen, which is an answer rather
     than a fault. */
  if (asked.searchParams.get("error")) return refuse("refused");

  const clientId = resendClientId();
  const verifier = jar.get("resend_verifier")?.value ?? "";
  const state = jar.get("resend_state")?.value ?? "";
  const address = jar.get("resend_from")?.value ?? "";
  const code = asked.searchParams.get("code") ?? "";

  if (!clientId || !verifier || !address || !code) return refuse("expired");

  /* The value that went out is the value that came back, which is what ties
     this answer to the press that asked for it. */
  if (!state || state !== asked.searchParams.get("state")) return refuse("expired");

  const got = await exchangeCode({
    clientId,
    redirectUri: await redirectUri(),
    code,
    verifier,
  });
  if (!got.ok) return refuse("exchange");

  const root = apexOf(address.split("@")[1] ?? "");
  if (!root) return refuse("noAddress");

  const made = await resendDomain(got.tokens.accessToken, root);
  if (!made.ok) return refuse("domain");

  const head = await headers();
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
    ip: head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? head.get("x-real-ip") ?? undefined,
  };

  await withTenant(ctx, async (tx) => {
    const providerId = await connectEmailProvider(tx, actor, {
      vendor: "resend",
      /* R21.15. The refresh token is what the worker sends with months from
         now. Resend rotates it on every use and refuses one used twice, so
         whatever refreshes it writes the new one back first. */
      credential: got.tokens.refreshToken,
      externalAccountId: made.domain.id,
      fromName: jar.get("resend_name")?.value ?? "",
      fromAddress: address,
      settings: null,
    });
    await saveSendingDomain(tx, actor, {
      providerId,
      domain: made.domain.name,
      records: made.domain.records,
    });
  });

  back.searchParams.set("resend", "connected");
  return forget(NextResponse.redirect(back));
}
