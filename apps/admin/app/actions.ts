"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { platform } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { requireOperator } from "@/lib/admin";
import { approvedMessage, sendAsPlatform } from "@connectapp/mail";

export interface Done {
  error?: string;
}

const say = (error: unknown) =>
  error instanceof Error ? error.message : "That did not work. Try again.";

/** R21.x. Signing in to the portal, with the same account the product uses. */
export async function signIn(_state: Done, data: FormData): Promise<Done> {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "");
  if (!email || !password) return { error: "Both an address and a password are needed." };

  const supabase = await supabaseServer();
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) {
    return { error: "That address and password do not match an account." };
  }

  const admin = await platform.platformAdmin(result.data.user.id);
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "That account does not operate the platform." };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

/** R1.1. A human has looked at this church. */
export async function approveChurch(data: FormData): Promise<Done> {
  const who = await requireOperator();
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
   * the church is approved either way: an operator who pressed Approve and saw
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
    const who = await requireOperator();
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
  const who = await requireOperator();
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
  const who = await requireOperator();
  try {
    await platform.archive(who.id, String(data.get("id")), String(data.get("note") ?? ""));
    revalidatePath("/churches");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}

export async function restoreChurch(data: FormData): Promise<Done> {
  const who = await requireOperator();
  try {
    await platform.restore(who.id, String(data.get("id")), String(data.get("note") ?? ""));
    revalidatePath("/churches");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}

/** R21.x. Another operator, by the address they sign in with. */
export async function grantAdmin(data: FormData): Promise<Done> {
  const who = await requireOperator();
  try {
    await platform.grant(who.id, String(data.get("email") ?? ""), String(data.get("name") ?? ""));
    revalidatePath("/admins");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}

export async function revokeAdmin(userId: string): Promise<Done> {
  const who = await requireOperator();
  try {
    await platform.revoke(who.id, userId);
    revalidatePath("/admins");
    return {};
  } catch (error) {
    return { error: say(error) };
  }
}

/** R21.x. The support lookup: which churches an address can sign in to. */
export async function lookupAccount(query: string) {
  const who = await requireOperator();
  return platform.findAccount(who.id, query);
}
