import { cache } from "react";
import { redirect } from "next/navigation";
import { platform } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

/**
 * R21.x. Who is at the keyboard, and whether they may be here at all.
 *
 * Two gates rather than one: Supabase says the session is real, and
 * platform_admins says this account operates the platform. A church's owner
 * has the first and not the second, so signing in with an ordinary account
 * lands on the door rather than on the churches.
 *
 * HRT-393, R24.11. Held for the length of one request. The portal's layout
 * asks, and then the screen inside it asks again for the id it reads with;
 * without this that is two sessions resolved and two queries to answer one
 * question. `cache` is per request and per render, so nothing is held between
 * one team member's request and the next.
 */
export const teamMember = cache(async (): Promise<TeamMember | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const admin = await platform.platformAdmin(user.id);
  if (!admin) return null;

  return { id: admin.id, name: admin.name, email: user.email ?? "" };
});

/** The same check, for a page that cannot render without one. */
export async function requireTeamMember(): Promise<TeamMember> {
  const who = await teamMember();
  if (!who) redirect("/sign-in");
  return who;
}
