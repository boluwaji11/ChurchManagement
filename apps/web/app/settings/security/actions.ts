"use server";

import { headers } from "next/headers";
import { t } from "@hearth/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { explainAuth } from "@/lib/auth-errors";
import { requireSession } from "@/lib/session";

export interface PasswordResult {
  error?: string;
}

/**
 * R1.8. Changing a password.
 *
 * The current one is checked by signing in with it. Supabase will change a
 * password on an open session without asking, and an open session on a shared
 * church laptop is exactly the case this has to refuse.
 */
export async function changePassword(data: FormData): Promise<PasswordResult> {
  const session = await requireSession();
  const current = String(data.get("current") ?? "");
  const next = String(data.get("next") ?? "");

  if (next.length < 10) return { error: t("signUp.error.password") };

  const supabase = await supabaseServer();
  const check = await supabase.auth.signInWithPassword({ email: session.email, password: current });
  if (check.error) return { error: t("password.error.wrong") };

  const { error } = await supabase.auth.updateUser({ password: next });
  return error ? { error: explainAuth(error) } : {};
}

/** R1.8. For somebody who has only ever signed in by email link. */
export async function emailMeALink(): Promise<PasswordResult> {
  const session = await requireSession();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:4488";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(session.email, {
    redirectTo: `${proto}://${host}/auth/callback?next=/reset`,
  });
  return error ? { error: explainAuth(error) } : {};
}

/**
 * R1.8. Changing the address you sign in with.
 *
 * Supabase sends a confirmation to both the old and the new address, and the
 * change lands only when it is answered. Nothing in our own tables moves here:
 * app_users follows on the next sign-in, and the record's email follows that.
 */
export async function changeEmail(data: FormData): Promise<PasswordResult> {
  const session = await requireSession();
  const next = String(data.get("email") ?? "").trim().toLowerCase();

  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(next)) return { error: t("email.error.format") };
  if (next === session.email.toLowerCase()) return { error: t("email.error.same") };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ email: next });
  return error ? { error: explainAuth(error) } : {};
}
