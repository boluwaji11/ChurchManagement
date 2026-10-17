import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { spanningSubdomains } from "@/lib/cookie-domain";
import { AUTH_BUDGET_MS, budgetedFetch } from "@/lib/budget";

const url = () => process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
const key = () => process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]!;

/**
 * The server-side Supabase client, for authentication only.
 *
 * Data access does not go through Supabase's REST API. It goes through Drizzle on
 * the tenant-scoped connection, because field-level permissions belong in our
 * query layer and our API is a designed surface rather than a table projection.
 * See docs/architecture.md.
 */
export async function supabaseServer() {
  const store = await cookies();

  // Sign-in happens on the server, so without this Supabase records the Node
  // fetch agent as the device and every row in the session list reads "unknown
  // device". Passing the browser's own agent through makes that list say
  // something a person can act on. R1.10.
  const agent = (await headers()).get("user-agent");

  return createServerClient(url(), key(), {
    /* R21.5. Authentication sits in front of every screen, so it is given ten
       seconds rather than however long the socket would hold on for. */
    global: {
      fetch: budgetedFetch(AUTH_BUDGET_MS),
      ...(agent ? { headers: { "User-Agent": agent } } : {}),
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            store.set(name, value, spanningSubdomains(options ?? {}));
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes the session instead, which is why it runs.
        }
      },
    },
  });
}
