"use server";

import {
  createInvitation, revokeInvitation, setMemberRole, removeMember, canManageChurch,
  rotateJoinCode, closeJoining,
  type TenantRole,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { headers } from "next/headers";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { sendTransactional } from "@/lib/send-mail";

export interface TeamResult {
  error?: string;
  /** R16.3. Set when the invitation went out as well as being recorded. */
  emailed?: string;
  /** R16.3. Set when the record was made but the message was not sent. */
  notEmailed?: string;
}

/** The address this church is reached on, for a link in an email. */
async function appOrigin(): Promise<string> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "localhost:4488";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const ROLES: TenantRole[] = [
  "owner", "admin", "staff", "pastoral", "finance", "group_leader", "checkin_volunteer", "member",
];

async function allowed(church?: string) {
  const session = await requireSession(church);
  if (!canManageChurch(session.role)) throw new Error(t("forbidden.askAdmin"));
  return session;
}

/** R1.7. Inviting somebody, by the address they will sign in with. */
export async function invite(data: FormData): Promise<TeamResult> {
  try {
    const session = await allowed(field(data, "church") || undefined);
    const email = field(data, "email").toLowerCase();
    const role = field(data, "role") as TenantRole;

    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return { error: t("team.error.email") };
    if (!ROLES.includes(role)) return { error: t("team.error.role") };

    await createInvitation({
      tenantId: session.tenantId,
      email,
      role,
      invitedByUserId: session.userId,
    });

    /*
     * R16.3. The invitation is recorded whatever happens to the message, and
     * the join link is still on the screen. A church whose mail is not set up
     * yet invites people the way it did before, and is told that is what
     * happened rather than being left to wonder.
     */
    const origin = await appOrigin();
    const sent = await sendTransactional(
      { tenantId: session.tenantId, role: session.role, userId: session.userId },
      "invitation",
      {
        to: email,
        subject: t("invite.mail.subject", { church: session.tenantName }),
        text: t("invite.mail.body", {
          church: session.tenantName,
          link: `${origin}/join?church=${session.tenantSlug}`,
        }),
      },
    );

    return sent.sent ? { emailed: email } : { notEmailed: sent.error ?? t("mail.failed") };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function withdraw(id: string, church?: string): Promise<TeamResult> {
  try {
    await allowed(church);
    await revokeInvitation(id);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.4. Changing what somebody may do. */
export async function changeRole(
  userId: string,
  role: TenantRole,
  church?: string,
): Promise<TeamResult> {
  try {
    const session = await allowed(church);
    await setMemberRole(session.tenantId, userId, role);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.4. Taking access away. The person's record in the church is untouched. */
export async function removeAccess(userId: string, church?: string): Promise<TeamResult> {
  try {
    const session = await allowed(church);
    await removeMember(session.tenantId, userId);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.7. A new code. Every card already handed out stops working. */
export async function newJoinCode(church?: string): Promise<TeamResult> {
  try {
    const session = await allowed(church);
    await rotateJoinCode(session.tenantId, session.role);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.7. Shutting the door. Nobody waiting loses their place. */
export async function stopJoining(church?: string): Promise<TeamResult> {
  try {
    const session = await allowed(church);
    await closeJoining(session.tenantId, session.role);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
