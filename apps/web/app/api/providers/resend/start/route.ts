import { NextResponse } from "next/server";
import { canManageChurch } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { authorizeUrl, newVerifier, resendClientId, sealHandshake } from "@/lib/resend-oauth";
import { here, redirectUri } from "../hop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HRT-288, R16.1. The press that sends a church to Resend.
 *
 * This is the only point in the journey with a session on it, so it is where
 * the church is read and where the permission is checked. Everything the way
 * back needs goes into a sealed state: which church, who pressed it, what mail
 * goes out as, and the verifier that proves the code came back to whoever
 * asked for it. Nothing readable leaves this server.
 */
export async function GET(request: Request) {
  const session = await requireSession();
  const back = new URL("/settings/email", request.url);

  if (!canManageChurch(session)) return NextResponse.redirect(back);

  const clientId = resendClientId();
  if (!clientId) {
    back.searchParams.set("resend", "unconfigured");
    return NextResponse.redirect(back);
  }

  const asked = new URL(request.url);
  const address = (asked.searchParams.get("from") ?? "").trim().toLowerCase();
  if (!address) {
    back.searchParams.set("resend", "noAddress");
    return NextResponse.redirect(back);
  }

  const { host } = await here();
  const verifier = newVerifier();

  return NextResponse.redirect(
    authorizeUrl({
      clientId,
      redirectUri: await redirectUri(),
      state: sealHandshake({
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId ?? null,
        /* The church's own address, so the way back lands where it started
           rather than on ours. Sealed, so it cannot be swapped in transit. */
        host,
        from: address,
        name: (asked.searchParams.get("name") ?? "").trim(),
        verifier,
      }),
      verifier,
    }),
  );
}
