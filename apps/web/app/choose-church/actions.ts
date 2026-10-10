"use server";

import { redirect } from "next/navigation";
import { verifyMembership, resolveTenantBySlug } from "@connectapp/db";
import { currentUser } from "@/lib/session";
import { rememberChurch } from "@/lib/church-choice";
import { landingForRole } from "@/lib/landing";

/**
 * R1.4. Picking a church out of the list.
 *
 * The membership is verified here as well as in requireSession, because this is
 * what writes the choice down and a name nobody checked would be remembered for
 * a year before the first screen refused it.
 */
export async function chooseChurch(data: FormData) {
  const slug = String(data.get("church") ?? "").trim();
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const tenant = slug ? await resolveTenantBySlug(slug) : null;
  const member = tenant ? await verifyMembership(user.id, tenant.id) : null;
  if (!member) redirect("/choose-church?reason=denied");

  await rememberChurch(member.tenantSlug);
  redirect(landingForRole(member.role));
}
