import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * HRT-396, R21.1. Refreshes the session, and turns away anybody without one.
 *
 * Two jobs, and the order matters. A Server Component cannot write cookies, so
 * an expired token would otherwise sign a team member out mid-task; that is what
 * the refresh is for and it is unchanged.
 *
 * What is new is the second half. The portal's own layout holds the real gate,
 * because deciding whether an account operates the platform means reading the
 * database and middleware runs where that connection does not belong. This is
 * the cheaper gate in front of it: a request carrying no session at all never
 * reaches a render. Defence in depth rather than the control itself.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  /* The door itself, and the route the cron calls, which carries its own
     secret and has no session to carry. */
  const open = path === "/sign-in" || path.startsWith("/api/");

  if (!data.user && !open) {
    const away = request.nextUrl.clone();
    away.pathname = "/sign-in";
    away.search = "";
    return NextResponse.redirect(away);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
