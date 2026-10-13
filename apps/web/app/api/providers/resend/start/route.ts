import { NextResponse } from "next/server";
import { canManageChurch } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { startHandshake, authorizeUrl, resendClientId } from "@/lib/resend-oauth";
import { here, redirectUri } from "../hop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Long enough to sign up at Resend and read the consent screen. */
const MINUTES = 15;

/**
 * HRT-288, R16.1. The press that sends a church to Resend.
 *
 * It leaves with nothing of ours: the verifier that proves the code came back
 * to whoever asked for it stays here in a cookie the browser never shows
 * anybody, and what travels is a random value and the church's own address.
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
  const { verifier, state } = startHandshake();

  const answer = NextResponse.redirect(
    authorizeUrl({
      clientId,
      redirectUri: await redirectUri(),
      /* The church's own address rides along, because the landing Resend
         returns to is on the parent and has no way of knowing it. */
      state: `${state}~${host}`,
      verifier,
    }),
  );

  const keep = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: asked.protocol === "https:",
    path: "/",
    maxAge: MINUTES * 60,
  };
  answer.cookies.set("resend_verifier", verifier, keep);
  answer.cookies.set("resend_state", state, keep);
  answer.cookies.set("resend_from", address, keep);
  answer.cookies.set("resend_name", (asked.searchParams.get("name") ?? "").trim(), keep);

  return answer;
}
