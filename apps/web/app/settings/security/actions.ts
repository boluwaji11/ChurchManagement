"use server";

import { headers } from "next/headers";
import { t } from "@hearth/i18n";
import { supabaseServer } from "@/lib/supabase/server";
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
  return error ? { error: error.message } : {};
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
  return error ? { error: error.message } : {};
}
