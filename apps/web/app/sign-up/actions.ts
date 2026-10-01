"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { syncUserAndAcceptInvitations } from "@hearth/db";
import { t } from "@hearth/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { explainAuth } from "@/lib/auth-errors";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:4488";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const fail = (message: string, next?: string): never =>
  redirect(
    `/sign-up?error=${encodeURIComponent(message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`,
  );

/**
 * R1.7, R22.1. Making an account.
 *
 * The address has to be proved before it is worth anything: an invitation is
 * matched to a verified address, and a church's first owner is granted to one.
 * So this sends a confirmation and nothing happens until they open it.
 */
export async function signUp(data: FormData) {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "");
  const fullName = String(data.get("fullName") ?? "").trim();
  const next = String(data.get("next") ?? "") || "/create-church";

  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return fail(t("signUp.error.email"), next);
  if (password.length < 10) return fail(t("signUp.error.password"), next);

  const supabase = await supabaseServer();
  const { data: created, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || null },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return fail(explainAuth(error), next);

  // A project that does not ask for confirmation hands back a session here, and
  // sending them to look in an inbox that will stay empty is how a product
  // loses somebody on its first screen.
  if (created.session) {
    await syncUserAndAcceptInvitations({
      id: created.user!.id,
      email: created.user!.email ?? email,
      fullName: fullName || null,
      emailVerified: true,
    });
    redirect(next);
  }

  redirect(`/sign-up?sent=${encodeURIComponent(email)}`);
}

/** R1.8. A link to set a password, for somebody who has forgotten or never had one. */
export async function sendReset(data: FormData) {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  if (!email) return fail(t("signIn.error.noEmail"));

  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset`,
  });

  // The same answer whether or not the address has an account, so this cannot
  // be used to find out who has one.
  redirect(`/sign-in?sent=${encodeURIComponent(email)}`);
}

/** R1.8. Choosing the password, once the link has proved the address. */
export async function setPassword(data: FormData): Promise<{ error?: string }> {
  const password = String(data.get("password") ?? "");
  if (password.length < 10) return { error: t("signUp.error.password") };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: explainAuth(error) };
  redirect("/sign-in?set=1");
}
