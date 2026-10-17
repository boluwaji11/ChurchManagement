"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { platform } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { DEV_PASS, gated, mintPass } from "@/lib/dev-gate";

/**
 * HRT-402, R21.x. Reading the team list, which middleware cannot do, and
 * writing down the answer.
 *
 * The pass lasts twelve hours. Somebody taken off the team in the portal keeps
 * what they are holding until it runs out, which is the price of not asking
 * the database on every request for a page that only the team can see anyway.
 */
export async function letMeIn(next: string): Promise<{ error?: string }> {
  if (!gated()) redirect(next || "/");

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { error: "Sign in first." };

  const member = await platform.platformAdmin(user.id);
  if (!member) return { error: "not-on-the-team" };

  const pass = await mintPass(user.id);
  if (!pass) return { error: "This deployment has no DEV_GATE_SECRET set." };

  const store = await cookies();
  store.set(DEV_PASS, pass, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });

  redirect(next && next.startsWith("/") ? next : "/");
}
