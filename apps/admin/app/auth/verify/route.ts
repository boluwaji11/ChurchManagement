import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HRT-401, R21.x. The portal's own half of the link in an invitation.
 *
 * The same thing `apps/web/app/auth/verify` does, on this host instead. It
 * has to be this host: Supabase sets the session wherever the token is handed
 * over, and a cookie written at connectapp.church is not one
 * admin.connectapp.church can read. An invitation proved on the other site
 * arrived signed in to the church product and signed out of the portal it was
 * an invitation to.
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

  /* A link with nothing in it is a link a mail program broke across two
     lines on the way. */
  if (!project || !token || !type) {
    return NextResponse.redirect(`${home}/join?why=partial`);
  }

  const back = asked.searchParams.get("redirect_to") || `${home}/join`;

  /* Only ever back to this host. An unchecked redirect_to here would carry a
     live token to wherever somebody asked. */
  const here = (() => {
    try {
      const to = new URL(back);
      return `${to.protocol}//${to.host}` === home ? back : `${home}/join`;
    } catch {
      return `${home}/join`;
    }
  })();

  const query = new URLSearchParams({ token, type, redirect_to: here });
  return NextResponse.redirect(`${project.replace(/\/$/, "")}/auth/v1/verify?${query.toString()}`);
}
