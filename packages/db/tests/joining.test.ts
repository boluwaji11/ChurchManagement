/**
 * HRT-114. Who gets into a congregation (R1.7).
 *
 * The whole of this is one question: whose address was already on the church's
 * records. Everything that could let somebody past that is tried here, because
 * a member role reads group rosters and the finder, and the only thing standing
 * between a forwarded link and those is this file.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { createPerson } from "../src/repo/people";
import {
  churchForJoinCode, joinWithCode, rotateJoinCode, closeJoining,
  waitingToJoin, decideJoinRequest, waitingOn, normaliseJoinCode,
} from "../src/repo/joining";
import { personForUser } from "../src/repo/scope";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let other: string;
let code: string;

const SLUG = "jointest";
const OTHER = "jointest-two";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

/** A verified account, as Supabase would hand one over. */
const account = (n: number, email: string, fullName: string | null = null) => ({
  id: `0000000a-0000-4000-8000-00000000000${n}`,
  email,
  fullName,
  emailVerified: true,
});

async function addEmail(personId: string, value: string) {
  await owner()`
    insert into contact_methods (tenant_id, person_id, kind, label, value, is_primary)
    values (${tenant}, ${personId}, 'email', 'home', ${value}, true)`;
}

async function makePerson(
  firstName: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const person = await run((tx) =>
    createPerson(tx, as(), {
      firstName, lastName: "Jointest", lifecycleStatus: "member", ...extra,
    } as never),
  );
  return person.id;
}

beforeAll(async () => {
  await owner()`delete from app_users where email like '%@jointest.invalid'`;
  tenant = await testTenant(SLUG, "Join Test Church");
  other = await testTenant(OTHER, "Other Join Test Church");
  code = await rotateJoinCode(tenant, "owner");
});

afterAll(async () => {
  await owner()`delete from app_users where email like '%@jointest.invalid'`;
  await dropTenants(SLUG, OTHER);
  await closeConnections();
});

describe("the code", () => {
  it("is read however it was written down", () => {
    expect(normaliseJoinCode(" ab3d-4k9p ")).toBe("AB3D4K9P");
  });

  it("finds its church, and a wrong one finds nothing", async () => {
    expect((await churchForJoinCode(code))?.tenantId).toBe(tenant);
    expect(await churchForJoinCode("ZZZZ9999")).toBeNull();
  });

  it("is only rotated by somebody who runs the church", async () => {
    await expect(rotateJoinCode(tenant, "member")).rejects.toBeInstanceOf(PermissionError);
    await expect(rotateJoinCode(tenant, "staff")).rejects.toBeInstanceOf(PermissionError);
  });

  it("stops working once it is rotated", async () => {
    const was = code;
    code = await rotateJoinCode(tenant, "owner");
    expect(code).not.toBe(was);
    expect(await churchForJoinCode(was)).toBeNull();
  });
});

describe("an address the church already holds", () => {
  it("claims that record and is a member in one step", async () => {
    const person = await makePerson("Maria");
    await addEmail(person, "Maria@Jointest.invalid");

    const outcome = await joinWithCode({
      code,
      user: account(1, "maria@jointest.invalid", "Maria Quinn"),
    });

    expect(outcome.status).toBe("joined");
    const linked = await run((tx) => personForUser(tx, account(1, "").id));
    expect(linked).toBe(person);

    const [membership] = await owner()<{ role: string }[]>`
      select role from tenant_members
      where tenant_id = ${tenant} and user_id = ${account(1, "").id}`;
    expect(membership?.role).toBe("member");
  });

  it("says so rather than joining twice", async () => {
    const outcome = await joinWithCode({
      code,
      user: account(1, "maria@jointest.invalid"),
    });
    expect(outcome.status).toBe("member");
  });
});

describe("an address the church does not hold", () => {
  it("waits, and is a visitor on the records rather than a member", async () => {
    const outcome = await joinWithCode({
      code,
      user: account(2, "stranger@jointest.invalid", "Someone Else"),
    });
    expect(outcome.status).toBe("waiting");

    const members = await owner()`
      select 1 from tenant_members where tenant_id = ${tenant} and user_id = ${account(2, "").id}`;
    expect(members.length).toBe(0);

    const waiting = await run((tx) => waitingToJoin(tx, as()));
    expect(waiting.map((row) => row.email)).toContain("stranger@jointest.invalid");
    expect(await waitingOn(account(2, "").id)).toHaveLength(1);
  });

  it("asks once, however many times they press it", async () => {
    await joinWithCode({ code, user: account(2, "stranger@jointest.invalid") });
    const waiting = await run((tx) => waitingToJoin(tx, as()));
    expect(waiting.filter((row) => row.email === "stranger@jointest.invalid")).toHaveLength(1);
  });

  it("becomes a member when the church says yes, holding the record it made", async () => {
    const [request] = await run((tx) => waitingToJoin(tx, as()));
    await run((tx) =>
      decideJoinRequest(tx, { ...as(), userId: account(1, "").id }, { id: request!.id, approve: true }),
    );

    const [membership] = await owner()<{ role: string }[]>`
      select role from tenant_members
      where tenant_id = ${tenant} and user_id = ${account(2, "").id}`;
    expect(membership?.role).toBe("member");

    const linked = await run((tx) => personForUser(tx, account(2, "").id));
    expect(linked).toBe(request!.personId);
    expect(await run((tx) => waitingToJoin(tx, as()))).toHaveLength(0);
  });

  it("keeps the visitor record when the church says no, and grants nothing", async () => {
    await joinWithCode({ code, user: account(3, "declined@jointest.invalid", "Nope Nope") });
    const [request] = await run((tx) => waitingToJoin(tx, as()));

    await run((tx) =>
      decideJoinRequest(tx, { ...as(), userId: account(1, "").id }, { id: request!.id, approve: false }),
    );

    const members = await owner()`
      select 1 from tenant_members where tenant_id = ${tenant} and user_id = ${account(3, "").id}`;
    expect(members.length).toBe(0);

    const [person] = await owner()<{ id: string }[]>`
      select id from people where id = ${request!.personId}`;
    expect(person).toBeTruthy();
  });
});

describe("what a code can never do", () => {
  it("does not claim a child's record", async () => {
    const child = await makePerson("Toby", { dateOfBirth: "2016-04-02" });
    await addEmail(child, "toby@jointest.invalid");

    const outcome = await joinWithCode({ code, user: account(4, "toby@jointest.invalid") });
    expect(outcome.status).toBe("waiting");

    const [row] = await owner()<{ app_user_id: string | null }[]>`
      select app_user_id from people where id = ${child}`;
    expect(row?.app_user_id).toBeNull();
  });

  it("does not claim a record somebody else already holds", async () => {
    // One record, two addresses, which is a household sharing a mailbox. The
    // first address claims it. The second must not walk into the same record.
    const person = await makePerson("Shared");
    await addEmail(person, "office@jointest.invalid");
    await addEmail(person, "office.two@jointest.invalid");
    expect((await joinWithCode({ code, user: account(5, "office@jointest.invalid") })).status)
      .toBe("joined");

    const outcome = await joinWithCode({ code, user: account(6, "office.two@jointest.invalid") });
    expect(outcome.status).toBe("waiting");
  });

  it("does not work on an address Supabase has not verified", async () => {
    await expect(
      joinWithCode({
        code,
        user: { ...account(7, "unverified@jointest.invalid"), emailVerified: false },
      }),
    ).rejects.toThrow();
  });

  it("does not reach another church", async () => {
    const outcome = await joinWithCode({ code, user: account(8, "elsewhere@jointest.invalid") });
    expect(outcome.status).toBe("waiting");
    const rows = await owner()`
      select 1 from join_requests where tenant_id = ${other}`;
    expect(rows.length).toBe(0);
  });

  it("does nothing at all once joining is switched off", async () => {
    await closeJoining(tenant, "owner");
    expect(await churchForJoinCode(code)).toBeNull();
    await expect(
      joinWithCode({ code, user: account(9, "late@jointest.invalid") }),
    ).rejects.toThrow();
    code = await rotateJoinCode(tenant, "owner");
  });
});

describe("the waiting list", () => {
  it("is not readable or decidable by somebody who does not run the church", async () => {
    await expect(run((tx) => waitingToJoin(tx, as("staff")), "staff")).rejects.toBeInstanceOf(
      PermissionError,
    );
    await expect(
      run(
        (tx) =>
          decideJoinRequest(
            tx,
            { tenantId: tenant, role: "member", userId: account(1, "").id },
            { id: "00000000-0000-4000-8000-000000000000", approve: true },
          ),
        "member",
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
