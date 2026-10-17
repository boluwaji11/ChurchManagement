"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { platform, platformHealth } from "@connectapp/db";
import { approvedMessage, sendAsPlatform } from "@connectapp/mail";
import { supabaseServer } from "@/lib/supabase/server";
import { requireTeamMember } from "@/lib/admin";

export interface Done {
  error?: string;
}

const say = (error: unknown) =>
  error instanceof Error ? error.message : "That did not work. Try again.";

/**
 * HRT-396, R21.1. Where the request came from.
 *
 * Vercel sets x-forwarded-for and the left-most entry is the client. It is
 * written down rather than trusted: nothing is decided from it, it is only
 * there so a burst of attempts reads as a burst when somebody looks.
 */
async function from(): Promise<{ ip: string | null; agent: string | null }> {
  const head = await headers();
  const forwarded = head.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() ?? head.get("x-real-ip"),
    agent: head.get("user-agent"),
  };
}

/**
 * HRT-396, R21.x. Signing in to the portal.
 *
 * Three gates. The address has to not be waiting out a lockout, Supabase has
 * to accept the password, and `platform_admins` has to say this account
 * operates the platform. Every attempt is written down, including the ones
 * that fail: this portal reaches every church on the platform, so who has
 * tried the door is worth as much as who got in.
 *
 * The refusals are all the same sentence on purpose. Telling somebody that the
 * password was right but the account is not a team member tells them they have
 * found a real address and that the only thing left to get is a grant.
 */
export async function signIn(_state: Done, data: FormData): Promise<Done> {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "");
  if (!email || !password) return { error: "Both an address and a password are needed." };

  const where = await from();

  const waiting = await platformHealth.waitingOut(email);
  if (waiting > 0) {
    await platformHealth.recordSignIn({ email, outcome: "throttled", ...where });
    return {
      error: `Too many attempts. Try again in ${waiting} minutes.`,
    };
  }

  const refused = "That address and password do not match a team member's account.";

  const supabase = await supabaseServer();
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) {
    await platformHealth.recordSignIn({ email, outcome: "wrong", ...where });
    return { error: refused };
  }

  const admin = await platform.platformAdmin(result.data.user.id);
  if (!admin) {
    /*
     * A real account with a real password that is not a team member. The session
     * is thrown away rather than left behind, because this app's middleware
     * would otherwise treat it as signed in and bounce them round a loop.
     */
    await supabase.auth.signOut();
    await platformHealth.recordSignIn({ email, outcome: "refused", ...where });
    return { error: refused };
  }

  await platformHealth.recordSignIn({ email, outcome: "in", ...where });
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

/** R1.1. A human has looked at this church. */
export async function approveChurch(data: FormData): Promise<Done> {
  const who = await requireTeamMember();
  const id = String(data.get("id"));

  try {
    await platform.approve(who.id, id, String(data.get("note") ?? ""));
    revalidatePath("/churches");
  } catch (error) {
    return { error: say(error) };
  }

  /*
   * HRT-388, R1.1, R22.1. The church is told, by the thing that happened.
   *
   * After the write rather than inside it, and outside the try above, because
   * the church is approved either way: a team member who pressed Approve and saw
   * a mail provider's refusal would reasonably press it again, and the
   * approval is already done.
   */
  await tellThemApproved(id);
  return {};
}

/**
 * HRT-388, R1.1. The word to whoever founded the church.
 *
 * The owner's address is what the platform screens already read for this
 * church, so nothing new is looked up. A church with no owner address is a
 * church nobody can be told about, which is quiet rather than a failure.
 */
async function tellThemApproved(id: string): Promise<void> {
  try {
    const who = await requireTeamMember();
    const found = await platform.church(who.id, id);
    if (!found?.ownerEmail) return;

    const sent = await sendAsPlatform(
      approvedMessage({
        to: found.ownerEmail,
        /* The owner's name is held whole, and the greeting wants the first of it. */
        firstName: found.ownerName?.trim().split(/\s+/)[0] ?? null,
        church: found.name,
      }),
    );
    if (!sent.ok && sent.connected) console.error("[approved] not sent", sent.said);
  } catch (error) {
    console.error("[approved] not sent", error);
  }
}

export async function unapproveChurch(data: FormData): Promise<Done> {
  const who = await requireTeamMember();
  try {
    await platform.unapprove(who.id, String(data.get("id")), String(data.get("note") ?? ""));
    revalidatePath("/churches");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}

/** R21.x. Out of service, with every record it holds kept. */
export async function archiveChurch(data: FormData): Promise<Done> {
  const who = await requireTeamMember();
  try {
    await platform.archive(who.id, String(data.get("id")), String(data.get("note") ?? ""));
    revalidatePath("/churches");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}

export async function restoreChurch(data: FormData): Promise<Done> {
  const who = await requireTeamMember();
  try {
    await platform.restore(who.id, String(data.get("id")), String(data.get("note") ?? ""));
    revalidatePath("/churches");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}

/** R21.x. Another team member, by the address they sign in with. */
export async function grantAdmin(data: FormData): Promise<Done> {
  const who = await requireTeamMember();
  try {
    await platform.grant(who.id, String(data.get("email") ?? ""), String(data.get("name") ?? ""));
    revalidatePath("/team");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}

export async function revokeAdmin(userId: string): Promise<Done> {
  const who = await requireTeamMember();
  try {
    await platform.revoke(who.id, userId);
    revalidatePath("/team");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}
