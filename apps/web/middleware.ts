import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { spanningSubdomains } from "@/lib/cookie-domain";
import { AUTH_BUDGET_MS, budgetedFetch } from "@/lib/budget";

/**
 * Refreshes the Supabase session on every request, because a Server Component
 * cannot write cookies and an expired token would otherwise log members out
 * mid-task. It authenticates only. Authorization, meaning which church a user
 * may reach and with what role, is decided in the data layer from the database.
 *
 * R24.11. `getClaims` rather than `getUser`. This project signs its tokens with
 * ES256 and publishes the key, so the signature and the expiry are checked here
 * with WebCrypto against a key set held for ten minutes, and nothing leaves the
 * building. `getUser` asked the authentication server on every navigation, and
 * the screen behind it asked a second time. The session is still refreshed when
 * the token is near its end, which is the reason this runs at all.
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
      /* R21.5. A refresh that cannot answer in ten seconds is not going to. */
      global: { fetch: budgetedFetch(AUTH_BUDGET_MS) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: asked } });
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, spanningSubdomains(options ?? {}));
          }
        },
      },
    },
  );

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  /*
   * HRT-288. The Resend landing is left out. It answers on the parent, where a
   * church's session cookie is never sent, so refreshing a session there finds
   * none and the church was asked to sign in in the middle of connecting. It
   * carries its own proof in a sealed state and needs no session.
   */
  matcher: [
    /*
     * R24.11. The machine routes are left out. The queue worker's tick and
     * Stripe's webhook carry their own proof, a bearer secret and a signature,
     * and hold no session to refresh: every one of them was paying for a round
     * trip to the authentication server to be told there was nobody there.
     */
    /* One string, because Next reads this statically and cannot follow a
       sum of them. */
    "/((?!_next/static|_next/image|favicon.ico|design|api/providers/resend/callback|api/email/drain|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
