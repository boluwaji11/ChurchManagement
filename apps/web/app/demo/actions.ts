"use server";

import { redirect } from "next/navigation";
import { createDemoChurch } from "@hearth/db";
import { supabaseServer } from "@/lib/supabase/server";
import { t } from "@hearth/i18n";

/**
 * R19.7 and R22.1. A church to look around, without an account.
 *
 * The visitor signs in anonymously and gets a church of their own, filled with
 * invented people and thrown away tomorrow. Nothing they press can reach a real
 * church, because a demo is a separate tenant and row-level security is the
 * boundary between it and everything else.
 *
 * Anonymous sign-ins have to be turned on for the Supabase project. Where they
 * are not, this says so plainly rather than passing a Supabase message through.
 */
export async function startDemo() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    redirect(`/sign-in?error=${encodeURIComponent(t("demo.error.unavailable"))}`);
  }

  const demo = await createDemoChurch(data.user.id);
  redirect(`/people?church=${demo.slug}`);
}
