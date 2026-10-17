import { NextResponse, type NextRequest } from "next/server";
import { platform, syncUserAndAcceptInvitations } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HRT-401, R21.x. Where an invitation lands, and the only place a grant is
 * made without somebody on the team pressing a button.
 *
 * One email and one press. Supabase has just proved the address, this reads
 * the session it set, and the token in the link says which invitation is being
 * answered. The address Supabase proved has to be the address that was asked,
 * which is checked in `claimInvite`: without it the link grants whoever opens
 * it, and a forwarded email is a likelier accident than an attacker.
 *
 * The account may not exist in `app_users` at all until this runs, which is
 * the whole reason the invitation exists. `syncUserAndAcceptInvitations`
 * writes it, from the verified user and nothing else.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("t");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const away = (why: string) =>
    NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(why)}`);

  if (searchParams.get("why") === "partial") {
    return away("That link arrived incomplete. Ask for another one.");
  }
  if (!token) return away("That link is missing its invitation.");

  const supabase = await supabaseServer();

  const proved = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "magiclink" | "email" | "invite",
        })
      : await supabase.auth.getUser();

  const user = proved.data.user;
  if (proved.error || !user?.email) {
    return away("That link has expired. Ask for another one.");
  }

  /* Supabase proved it, so this is the first moment the address is worth
     anything. Accepting earlier would make an invitation a way in by
     claiming somebody else's address. */
  await syncUserAndAcceptInvitations({
    id: user.id,
    email: user.email,
    fullName: (user.user_metadata?.["full_name"] as string | undefined) ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
  });

  try {
    await platform.claimInvite(token, { id: user.id, email: user.email });
  } catch (error) {
    return away(error instanceof Error ? error.message : "That invitation did not work.");
  }

  return NextResponse.redirect(`${origin}/`);
}
