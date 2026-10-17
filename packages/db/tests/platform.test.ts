/**
 * HRT-400, R21.x. The portal grants and takes away its own operators.
 *
 * Written because none of this was covered and the gap was expensive: every
 * table carrying a tenant_id gets an audit trigger, found by looking rather
 * than by a list, and `platform_events.tenant_id` looks exactly like one of
 * those while being null for anything not done to a single church. So the
 * audit row had no tenant, the insert was refused, and the one action that
 * lets a second person into the portal failed against a database that had
 * passed every other test.
 *
 * The cases below go through the same functions the Operators screen calls, so
 * a trigger that should not be there fails here rather than in production.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, closeConnections } from "../src/client";
import {
  platformAdmin, admins, grant, revoke, events, PlatformError,
} from "../src/repo/platform";

/* Three accounts: the one that already operates the platform, the one being
   let in, and one that has an account and no business here. */
const FIRST = "11111111-2222-4333-8444-aaaa00000001";
const SECOND = "11111111-2222-4333-8444-aaaa00000002";
const OUTSIDER = "11111111-2222-4333-8444-aaaa00000003";

const ADDRESS = {
  first: "platform-test-first@connectapp.example.org",
  second: "platform-test-second@connectapp.example.org",
  outsider: "platform-test-outsider@connectapp.example.org",
};

async function clear(): Promise<void> {
  const ids = [FIRST, SECOND, OUTSIDER];
  await owner()`delete from platform_events where actor_id in ${owner()(ids)}`;
  await owner()`delete from platform_admins where user_id in ${owner()(ids)}`;
  await owner()`delete from app_users where id in ${owner()(ids)}`;
}

beforeAll(async () => {
  await clear();
  await owner()`
    insert into app_users (id, email, full_name) values
      (${FIRST}, ${ADDRESS.first}, 'First Operator'),
      (${SECOND}, ${ADDRESS.second}, 'Second Operator'),
      (${OUTSIDER}, ${ADDRESS.outsider}, 'Not An Operator')`;
  await owner()`
    insert into platform_admins (user_id, name) values (${FIRST}, 'First Operator')`;
});

afterAll(async () => {
  await clear();
  await closeConnections();
});

describe("who operates the platform", () => {
  it("knows the one account that does", async () => {
    expect(await platformAdmin(FIRST)).toMatchObject({ name: "First Operator" });
    expect(await platformAdmin(OUTSIDER)).toBeNull();
    expect(await platformAdmin("")).toBeNull();
  });

  it("refuses every read to an account that does not", async () => {
    await expect(admins(OUTSIDER)).rejects.toThrow(PlatformError);
    await expect(events(OUTSIDER)).rejects.toThrow(PlatformError);
    await expect(grant(OUTSIDER, ADDRESS.second, "Second Operator")).rejects.toThrow(
      PlatformError,
    );
  });
});

describe("letting somebody else in", () => {
  it("grants by the address they already sign in with, and says who did it", async () => {
    await grant(FIRST, ADDRESS.second, "Second Operator");

    expect(await platformAdmin(SECOND)).toMatchObject({ name: "Second Operator" });

    const rows = await admins(FIRST);
    const added = rows.find((one) => one.email === ADDRESS.second);
    expect(added).toMatchObject({
      name: "Second Operator",
      grantedByName: "First Operator",
      revokedAt: null,
    });
  });

  it("writes the grant to the log with no church attached", async () => {
    /* The case the audit trigger broke. A grant is not done to one church, so
       its event carries no tenant, and that has to be allowed to happen. */
    const log = await events(FIRST, { limit: 10 });
    const entry = log.find((one) => one.action === "granted");
    expect(entry).toBeDefined();
    expect(entry!.tenantId).toBeNull();
    expect(entry!.note).toContain(ADDRESS.second);
  });

  it("takes an address that does not sign in anywhere as a mistake", async () => {
    await expect(grant(FIRST, "nobody@connectapp.example.org", "Nobody")).rejects.toThrow(
      "No account signs in with that address yet",
    );
  });

  it("wants both an address and a name", async () => {
    await expect(grant(FIRST, ADDRESS.second, "  ")).rejects.toThrow(PlatformError);
    await expect(grant(FIRST, "  ", "Second Operator")).rejects.toThrow(PlatformError);
  });
});

describe("taking it away", () => {
  it("leaves the row, so the log still reads", async () => {
    await revoke(FIRST, SECOND);

    expect(await platformAdmin(SECOND)).toBeNull();
    const rows = await admins(FIRST);
    const gone = rows.find((one) => one.email === ADDRESS.second);
    expect(gone?.revokedAt).toBeInstanceOf(Date);
    expect(gone?.name).toBe("Second Operator");
  });

  it("will not lock the last person out of their own portal", async () => {
    await expect(revoke(FIRST, FIRST)).rejects.toThrow("locked out");
    expect(await platformAdmin(FIRST)).not.toBeNull();
  });

  it("refuses an account that was not an operator in the first place", async () => {
    await expect(revoke(FIRST, OUTSIDER)).rejects.toThrow("does not operate the platform");
  });

  it("lets a revoked operator back in, carrying a fresh grant", async () => {
    await grant(FIRST, ADDRESS.second, "Second Operator");
    expect(await platformAdmin(SECOND)).not.toBeNull();
  });
});
