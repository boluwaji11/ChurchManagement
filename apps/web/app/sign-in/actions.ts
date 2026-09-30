"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { syncUserAndAcceptInvitations } from "@hearth/db";
import { t } from "@hearth/i18n";
import { supabaseServer } from "@/lib/supabase/server";

/** Returns never, so callers use `return fail(...)` and control flow narrows. */
const fail = (message: string, next?: string): never =>
  redirect(`/sign-in?error=${encodeURIComponent(message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:4488";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendMagicLink(data: FormData) {
  const email = String(data.get("email") ?? "").trim();
  const next = String(data.get("next") ?? "") || undefined;
  if (!email) return fail(t("signIn.error.noEmail"), next);

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await origin()}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
    },
  });

  if (error) return fail(error.message, next);
  redirect(`/sign-in?sent=${encodeURIComponent(email)}`);
}

export async function signInWithPassword(data: FormData) {
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  const next = String(data.get("next") ?? "") || undefined;

  const supabase = await supabaseServer();
  const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });

  // One message for a wrong password and for an address with no account, so the
  // form cannot be used to find out who has an account.
  if (error || !result.user) return fail(t("signIn.error.noMatch"), next);

  await syncUserAndAcceptInvitations({
    id: result.user.id,
    email: result.user.email ?? email,
    fullName: (result.user.user_metadata?.["full_name"] as string | undefined) ?? null,
    emailVerified: Boolean(result.user.email_confirmed_at),
  });

  redirect(next || "/people");
}
