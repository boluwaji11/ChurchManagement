import { redirect } from "next/navigation";
import { platform } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";

export interface Operator {
  id: string;
  name: string;
  email: string;
}

/**
 * R21.x. Who is at the keyboard, and whether they may be here at all.
 *
 * Two gates rather than one: Supabase says the session is real, and
 * platform_admins says this account operates the platform. A church's owner has
 * the first and not the second, so signing in with an ordinary account lands on
 * the door rather than on the churches.
 */
export async function operator(): Promise<Operator | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const admin = await platform.platformAdmin(user.id);
  if (!admin) return null;

  return { id: admin.id, name: admin.name, email: user.email ?? "" };
}

/** The same check, for a page that cannot render without one. */
export async function requireOperator(): Promise<Operator> {
  const who = await operator();
  if (!who) redirect("/sign-in");
  return who;
}
