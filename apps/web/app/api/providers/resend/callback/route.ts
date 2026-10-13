import { NextResponse } from "next/server";
import { here, ours } from "../hop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HRT-288, R16.1. The one address Resend knows, which is a doorstep.
 *
 * Resend returns to the parent, because that is the address registered with
 * it and because registering one a church is not the same as registering one.
 * Nothing is exchanged here: the code is handed on to the church's own
 * address, which is where the session is and where the verifier is waiting.
 */
export async function GET(request: Request) {
  const asked = new URL(request.url);
  const { proto, parent } = await here();

  const code = asked.searchParams.get("code") ?? "";
  const [state, host] = (asked.searchParams.get("state") ?? "").split("~");

  /* R1.4. The address came back from outside, so it is checked against this
     very parent before anybody is sent to it. */
  const home = host && ours(host, parent) ? host : parent;
  const on = new URL(`${proto}://${home}/api/providers/resend/finish`);

  if (code) on.searchParams.set("code", code);
  if (state) on.searchParams.set("state", state);
  const refused = asked.searchParams.get("error");
  if (refused) on.searchParams.set("error", refused);

  return NextResponse.redirect(on);
}
