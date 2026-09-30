import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  membershipsForUser, verifyMembership, resolveTenantBySlug,
  type Membership, type TenantRole,
} from "@hearth/db";
import { supabaseServer } from "./supabase/server";

export interface Session {
  userId: string;
  email: string;
  /** What to call them on screen. Their email address if they gave no name. */
  displayName: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: TenantRole;
  memberships: Membership[];
}

/**
 * The authenticated user, or null. Cached per request, so several components can
 * ask without several round trips.
 */
export const currentUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    fullName: (data.user.user_metadata?.["full_name"] as string | undefined) ?? null,
    emailVerified: Boolean(data.user.email_confirmed_at),
  };
});

/**
 * Resolves the session for a church, verifying membership against the database.
 *
 * This is the authorization boundary. Row-level security stops a request reading
 * another church's data once a context is set; it says nothing about which
 * context a user may set. That decision is made here, from tenant_members, never
 * from a cookie, a query parameter, or anything else the client controls.
 *
 * A church the user does not belong to is reported exactly like a church that
 * does not exist, so a URL cannot be used to discover who is on the platform.
 */
export const requireSession = cache(async (slug?: string): Promise<Session> => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const memberships = await membershipsForUser(user.id);
  if (memberships.length === 0) redirect("/choose-church?reason=none");

  let chosen: Membership | undefined;

  if (slug) {
    const tenant = await resolveTenantBySlug(slug);
    // Same outcome whether the church does not exist or the user is not in it.
    chosen = tenant ? ((await verifyMembership(user.id, tenant.id)) ?? undefined) : undefined;
    if (!chosen) redirect("/choose-church?reason=denied");
  } else if (memberships.length === 1) {
    chosen = memberships[0];
  } else {
    redirect("/choose-church");
  }

  const m = chosen!;
  return {
    userId: user.id,
    email: user.email,
    displayName: user.fullName?.trim() || user.email,
    tenantId: m.tenantId,
    tenantName: m.tenantName,
    tenantSlug: m.tenantSlug,
    role: m.role,
    memberships,
  };
});

/**
 * The id of the session this request is using, for marking "this device" in the
 * list and for keeping it when the others are ended.
 *
 * Read from the access token's own claim. The token was already verified by
 * currentUser() through Supabase, and the claim is used only to compare against
 * session ids the database returned, so a forged one matches nothing.
 */
export const currentSessionId = cache(async (): Promise<string | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      session_id?: string;
    };
    return json.session_id ?? null;
  } catch {
    return null;
  }
});
