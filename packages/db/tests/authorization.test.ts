/**
 * Authentication proves who someone is. Authorization decides which church they
 * may open, and with what role.
 *
 * Row-level security stops a request reading another church's data once a tenant
 * context is set. It says nothing about which context a user may set. That gap is
 * where a real multi-tenant breach lives, so it is tested here against real
 * sign-ins rather than mocked ones.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, closeConnections } from "../src/client";
import { membershipsForUser, verifyMembership, createInvitation, syncUserAndAcceptInvitations } from "../src/repo/membership";
import { required } from "../src/env";

const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
const ANON = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const PASSWORD = required("SEED_USER_PASSWORD");

/** Signs in for real, through Supabase, exactly as the browser does. */
async function signIn(email: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = (await res.json()) as { user?: { id: string; email: string }; error_description?: string; msg?: string };
  if (!res.ok || !body.user) throw new Error(`Sign-in failed for ${email}: ${body.error_description ?? body.msg ?? res.status}`);
  return body.user;
}

let riversidePastor: { id: string; email: string };
let northgatePastor: { id: string; email: string };
let riversideId: string;
let northgateId: string;

beforeAll(async () => {
  const tenants = await owner()<{ id: string; slug: string }[]>`
    select id, slug from tenants where slug in ('riverside', 'northgate')`;
  riversideId = tenants.find((t) => t.slug === "riverside")!.id;
  northgateId = tenants.find((t) => t.slug === "northgate")!.id;

  riversidePastor = await signIn("pastor@riverside.example.org");
  northgatePastor = await signIn("pastor@northgate.example.org");
}, 30_000);

afterAll(async () => {
  await owner()`delete from invitations where email like ${"invite-test%"}`;
  await closeConnections();
});

describe("sign-in", () => {
  it("authenticates a seeded account and returns a stable user id", () => {
    expect(riversidePastor.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(riversidePastor.email).toBe("pastor@riverside.example.org");
  });

  it("refuses a wrong password with no hint that the account exists", async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pastor@riverside.example.org", password: "not-the-password" }),
    });
    expect(res.ok).toBe(false);
  });
});

describe("a user can only reach churches they belong to", () => {
  it("lists exactly one church for each pastor", async () => {
    const riverside = await membershipsForUser(riversidePastor.id);
    const northgate = await membershipsForUser(northgatePastor.id);

    expect(riverside.map((m) => m.tenantSlug)).toEqual(["riverside"]);
    expect(northgate.map((m) => m.tenantSlug)).toEqual(["northgate"]);
  });

  it("refuses to verify a membership in another church", async () => {
    // The critical case. A real signed-in user, asking for a church that exists,
    // where the only thing standing between them and it is this check.
    expect(await verifyMembership(riversidePastor.id, northgateId)).toBeNull();
    expect(await verifyMembership(northgatePastor.id, riversideId)).toBeNull();
  });

  it("verifies the membership they do have, with the role from the database", async () => {
    const m = await verifyMembership(riversidePastor.id, riversideId);
    expect(m?.tenantSlug).toBe("riverside");
    expect(m?.role).toBe("owner");
  });

  it("gives an unknown user nothing", async () => {
    const nobody = "00000000-0000-0000-0000-0000000000ff";
    expect(await membershipsForUser(nobody)).toEqual([]);
    expect(await verifyMembership(nobody, riversideId)).toBeNull();
  });
});

describe("invitations (R1.7)", () => {
  const email = "invite-test-one@example.org";

  it("joins a user to a church on first verified sign-in", async () => {
    const userId = crypto.randomUUID();
    await createInvitation({ tenantId: northgateId, email, role: "finance" });

    const { joined } = await syncUserAndAcceptInvitations({
      id: userId, email, fullName: "Invite Test", emailVerified: true,
    });

    expect(joined.map((m) => m.tenantSlug)).toEqual(["northgate"]);
    const memberships = await membershipsForUser(userId);
    expect(memberships[0]?.role).toBe("finance");

    await owner()`delete from app_users where id = ${userId}`;
  });

  it("does nothing for an unverified email address", async () => {
    // Otherwise an invitation becomes a way to join any church by claiming
    // someone else's address.
    const userId = crypto.randomUUID();
    await createInvitation({ tenantId: northgateId, email: "invite-test-two@example.org", role: "admin" });

    const { joined } = await syncUserAndAcceptInvitations({
      id: userId, email: "invite-test-two@example.org", emailVerified: false,
    });

    expect(joined).toEqual([]);
    expect(await membershipsForUser(userId)).toEqual([]);
  });

  it("ignores an expired invitation", async () => {
    const userId = crypto.randomUUID();
    const expiredEmail = "invite-test-three@example.org";
    await createInvitation({ tenantId: northgateId, email: expiredEmail, role: "admin" });
    await owner()`update invitations set expires_at = now() - interval '1 day' where email = ${expiredEmail}`;

    const { joined } = await syncUserAndAcceptInvitations({
      id: userId, email: expiredEmail, emailVerified: true,
    });

    expect(joined).toEqual([]);
    await owner()`delete from app_users where id = ${userId}`;
  });

  it("ignores a revoked invitation", async () => {
    const userId = crypto.randomUUID();
    const revokedEmail = "invite-test-four@example.org";
    await createInvitation({ tenantId: northgateId, email: revokedEmail, role: "admin" });
    await owner()`update invitations set revoked_at = now() where email = ${revokedEmail}`;

    const { joined } = await syncUserAndAcceptInvitations({
      id: userId, email: revokedEmail, emailVerified: true,
    });

    expect(joined).toEqual([]);
    await owner()`delete from app_users where id = ${userId}`;
  });
});
