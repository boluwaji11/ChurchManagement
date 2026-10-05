import { NextResponse, type NextRequest } from "next/server";
import { syncUserAndAcceptInvitations } from "@hearth/db";
import { supabaseServer } from "@/lib/supabase/server";
import { explainAuth } from "@/lib/auth-errors";

/**
 * Where an email link lands. Handles both shapes Supabase sends: a PKCE `code`,
 * and a `token_hash` plus `type` pair.
 *
 * Invitations are accepted here rather than at invite time, because this is the
 * first moment the email address is known to be verified. Accepting earlier would
 * turn an invitation into a way to join a church by claiming someone's address.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") || "/members";

  const supabase = await supabaseServer();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "magiclink" | "email" | "recovery" | "invite" })
      : { data: { user: null }, error: new Error("This link is missing its token.") };

  if (result.error || !result.data.user) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(explainAuth(result.error))}`,
    );
  }

  const user = result.data.user;
  await syncUserAndAcceptInvitations({
    id: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.["full_name"] as string | undefined) ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
  });

  return NextResponse.redirect(`${origin}${next}`);
}
