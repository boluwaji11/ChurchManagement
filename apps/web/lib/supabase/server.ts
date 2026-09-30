import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  return createServerClient(url(), key(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes the session instead, which is the point of it.
        }
      },
    },
  });
}
