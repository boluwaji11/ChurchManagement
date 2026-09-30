/**
 * HRT-14. Session list and remote revoke (R1.10).
 *
 * The session records belong to Supabase Auth, so most of this suite only runs
 * against a Supabase database. Against a plain Postgres, including CI, the
 * functions are absent and the check is that the absence is reported rather
 * than thrown, because a missing feature must not take a settings page down.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  listSessions, sessionsAvailable, revokeSession, describeDevice,
} from "../src/repo/sessions";

let riverside: string;
let available = false;

const run = <T>(work: (tx: Tx) => Promise<T>, userId?: string) =>
  withTenant({ tenantId: riverside, role: "owner", userId }, work);

beforeAll(async () => {
  const rows = await owner()<{ id: string }[]>`select id from tenants where slug = 'riverside'`;
  riverside = rows[0]!.id;
  available = await run((tx) => sessionsAvailable(tx));
});

afterAll(async () => {
  await closeConnections();
});

describe("naming a device", () => {
  it("reports the part somebody can act on", () => {
    const chrome = describeDevice(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
    );
    expect(chrome).toEqual({ browser: "Chrome", platform: "Mac" });

    const iphone = describeDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    );
    expect(iphone).toEqual({ browser: "Safari", platform: "iPhone" });

    // Edge and Opera both claim to be Chrome, so order of testing matters.
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/131.0 Safari/537.36 Edg/131.0").browser)
      .toBe("Edge");
  });

  it("says unknown rather than guessing", () => {
    expect(describeDevice(null)).toEqual({ browser: "unknown", platform: "unknown" });
    expect(describeDevice("curl/8.4.0").browser).toBe("unknown");
  });
});

describe("the session list", () => {
  it("reports an absent auth schema rather than throwing", async () => {
    if (available) return;
    expect(await run((tx) => listSessions(tx))).toBeNull();
  });

  it("returns nothing when no user is set on the transaction", async () => {
    if (!available) return;
    // app.user_id blank means no caller, so the function must answer with zero
    // rows rather than with everybody's.
    expect(await run((tx) => listSessions(tx))).toEqual([]);
  });

  it("returns only the caller's own sessions", async () => {
    if (!available) return;

    const users = await owner()<{ id: string }[]>`
      select u.id from app_users u
      join tenant_members m on m.user_id = u.id
      where m.tenant_id = ${riverside} limit 2`;
    if (users.length < 2) return;

    const first = await run((tx) => listSessions(tx), users[0]!.id);
    const second = await run((tx) => listSessions(tx), users[1]!.id);

    const overlap = (first ?? []).filter((a) => (second ?? []).some((b) => b.id === a.id));
    expect(overlap).toEqual([]);
  });

  it("revokes nothing for a session id that is not the caller's", async () => {
    if (!available) return;
    const invented = "00000000-0000-4000-8000-000000000000";
    expect(await run((tx) => revokeSession(tx, invented), "00000000-0000-4000-8000-000000000001"))
      .toBe(0);
  });
});
