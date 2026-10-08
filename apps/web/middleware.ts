import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request, because a Server Component
 * cannot write cookies and an expired token would otherwise log members out
 * mid-task. It authenticates only. Authorization, meaning which church a user
 * may reach and with what role, is decided in the data layer from the database.
 */
export async function middleware(request: NextRequest) {
  /*
   * R1.4. The address the request is on, passed through on the request so a
   * server component can read it. A screen cannot see its own URL, and a
   * refusal that cannot name where the reader was going has to send them
   * somewhere arbitrary afterwards.
   */
  const asked = new Headers(request.headers);
  asked.set("x-pathname", request.nextUrl.pathname);
  asked.set("x-search", request.nextUrl.search);

  let response = NextResponse.next({ request: { headers: asked } });

  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: asked } });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|design|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};
