import { NextResponse, type NextRequest } from "next/server";
import { t } from "@connectapp/i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HRT-392, R1.7, R17.1. The address in a confirmation email, on our own name.
 *
 * Supabase proves the token on its own host, and a link to it says
 * `nvdovjuqcnxacvhxfrmi.supabase.co` in the status bar of every church that
 * hovers over the button. That is somebody else's name on the one message
 * asking them to trust us, and it is the shape a phishing mail takes.
 *
 * So the button points here and this sends them on. The token is proved in
 * the same place it always was; what changes is the name a reader sees.
 *
 * Nothing here is a control. The token is Supabase's to accept or refuse, and
 * this hands it over untouched.
 */
export function GET(request: NextRequest) {
  const asked = new URL(request.url);
  const token = asked.searchParams.get("token");
  const type = asked.searchParams.get("type");

  const project = process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const home = `${asked.protocol}//${asked.host}`;

  /* A link with nothing in it is a link somebody mangled on the way, which is
     what a mail program that breaks a long URL across two lines does. */
  if (!project || !token || !type) {
    return NextResponse.redirect(
      `${home}/sign-in?error=${encodeURIComponent(t("auth.error.partialLink"))}`,
    );
  }

  /*
   * Where Supabase sends them once the token is proved. Our own callback,
   * which is the only thing that knows what to do with what comes back, and
   * ours rather than the church's because the session cookie is set there.
   */
  const back = asked.searchParams.get("redirect_to") || `${home}/auth/callback`;

  const query = new URLSearchParams({ token, type, redirect_to: back });
  return NextResponse.redirect(`${project.replace(/\/$/, "")}/auth/v1/verify?${query.toString()}`);
}
