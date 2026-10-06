import "server-only";
import { readsAs } from "./spelling";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  membershipsForUser, verifyMembership, resolveTenantBySlug, resolveTenantByHost,
  demoMembership,
  type Membership, type TenantRole, type Permission,
} from "@connectapp/db";
import { supabaseServer } from "./supabase/server";
import { readDemoPass } from "./demo-pass";

export interface Session {
  userId: string;
  email: string;
  /** What to call them on screen. Their email address if they gave no name. */
  displayName: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  /** R22.8. Which spelling this church reads. */
  tenantCountry: string;
  role: TenantRole;
  /**
   * R1.6. The permissions this session holds, for somebody on a role their
   * church wrote. Null means the built-in role above, which the matrix answers.
   * Every canX() takes the session as well as a bare role, so passing `session`
   * where a role used to go is what makes a custom role grant anything.
   */
  permissions: Permission[] | null;
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
    firstName: (data.user.user_metadata?.["first_name"] as string | undefined) ?? null,
    lastName: (data.user.user_metadata?.["last_name"] as string | undefined) ?? null,
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
/**
 * R19.7. The session a demo visitor gets, built from their signed pass.
 *
 * Owner of one throwaway church and nothing else. The pass is signed, and the
 * lookup refuses any tenant without a demo expiry in the future, so this can
 * never hand somebody a way into a real church.
 */
const demoVisitorSession = cache(async (): Promise<Session | null> => {
  const pass = await readDemoPass();
  if (!pass) return null;

  const demo = await demoMembership(pass.tenantId, pass.userId);
  if (!demo) return null;

  return {
    userId: pass.userId,
    email: "",
    displayName: "Visitor",
    tenantId: demo.tenantId,
    tenantName: demo.name,
    tenantSlug: demo.slug,
    tenantCountry: "US",
    role: "owner",
    permissions: null,
    memberships: [],
  };
});

/**
 * R1.1, R17.1. The church this request arrived at, where the host names one.
 *
 * A church pointing its own name at the app means every screen underneath is
 * that church's without a word of it in the address. Cached per request,
 * because every screen asks and the answer cannot change mid-render.
 */
export const churchFromHost = cache(async (): Promise<string | null> => {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  if (!host) return null;
  const found = await resolveTenantByHost(host);
  return found?.slug ?? null;
});

export const requireSession = cache(async (asked?: string): Promise<Session> => {
  /*
   * The address in the request wins, because a link somebody was sent names
   * the church on purpose. Failing that, the host answers, which is what makes
   * a church's own domain feel like the church's own software.
   */
  const slug = asked ?? (await churchFromHost());

  const user = await currentUser();
  if (!user) {
    const demo = await demoVisitorSession();
    if (demo) return demo;
    redirect("/sign-in");
  }

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

  /*
   * R22.8. Settled here, before any screen reads a word.
   *
   * It used to be set in the shell, and a shell is handed its page already
   * rendered, so every string on the page had been resolved before the shell
   * said which spelling to resolve them in. Every screen awaits this first.
   */
  readsAs(m.tenantCountry);

  return {
    userId: user.id,
    email: user.email,
    displayName: user.fullName?.trim() || user.email,
    tenantId: m.tenantId,
    tenantName: m.tenantName,
    tenantSlug: m.tenantSlug,
    tenantCountry: m.tenantCountry,
    role: m.role,
    permissions: m.permissions,
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
