/**
 * HRT-275. Who is told a line has arrived (R16.9, R16.10).
 *
 * A push goes to a browser rather than to a person, and the link has to open
 * the conversation in the inbox that reader actually uses: the same thread is
 * "the office" to a member and "Mina Message" to the office. These hold the
 * addressing, and they hold the one rule that keeps staff reading their
 * notifications at all: a group's own chatter stays out of the office until
 * the office has written into it.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { sendMessage, tellAbout, type Reader } from "../src/repo/messages";
import { createPerson, getPerson } from "../src/repo/members";
import { linkPersonToUser } from "../src/repo/scope";
import { createGroup, addToGroup, seedGroupTypes, listGroupTypes } from "../src/repo/groups";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let groupSlug: string;

const run = <T>(work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId: tenant, role: "owner" }, work);

const CHURCH = "Push Church";

/** The three readers: the office, and two people in one group. */
let office: Reader;
let mina: Reader;
let pat: Reader;
let minaSlug: string;

/** An account, which is what a push is addressed to. */
async function account(email: string): Promise<string> {
  const id = crypto.randomUUID();
  await owner()`insert into app_users (id, email) values (${id}, ${email})`;
  return id;
}

async function person(first: string, userId: string): Promise<{ id: string; slug: string }> {
  const made = await run((tx) =>
    createPerson(tx, { tenantId: tenant, role: "owner" }, {
      firstName: first, lastName: "Push", lifecycleStatus: "member",
    } as never),
  );
  await run((tx) => linkPersonToUser(tx, made.id, userId));
  const held = await run((tx) => getPerson(tx, made.id));
  return { id: made.id, slug: held!.slug };
}

beforeAll(async () => {
  tenant = await testTenant("push-inbox", CHURCH);

  const staffUser = await account("push-office@example.org");
  const minaUser = await account("push-mina@example.org");
  const patUser = await account("push-pat@example.org");

  /* Whoever answers for the church is found by role, so the office account
     needs its seat in the church rather than only its login. */
  await owner()`
    insert into tenant_members (tenant_id, user_id, role)
    values (${tenant}, ${staffUser}, 'staff'),
           (${tenant}, ${minaUser}, 'member'),
           (${tenant}, ${patUser}, 'member')`;

  const one = await person("Mina", minaUser);
  const two = await person("Pat", patUser);
  minaSlug = one.slug;

  office = { tenantId: tenant, userId: staffUser, memberId: null, office: true };
  mina = { tenantId: tenant, userId: minaUser, memberId: one.id, office: false };
  pat = { tenantId: tenant, userId: patUser, memberId: two.id, office: false };

  await run((tx) => seedGroupTypes(tx, { tenantId: tenant, role: "owner" }));
  const [kind] = await run((tx) => listGroupTypes(tx));
  const group = await run((tx) =>
    createGroup(tx, { tenantId: tenant, role: "owner" }, {
      name: "Tuesday Night", typeId: kind!.id,
    } as never),
  );
  groupSlug = group.slug;
  await run((tx) => addToGroup(tx, { tenantId: tenant, role: "owner" }, {
    groupId: group.id, memberId: one.id, role: "leader",
  }));
  await run((tx) => addToGroup(tx, { tenantId: tenant, role: "owner" }, {
    groupId: group.id, memberId: two.id,
  }));
});

afterAll(async () => {
  await owner()`delete from app_users where email like 'push-%@example.org'`;
  await dropTenants("push-inbox");
  await closeConnections();
});

const tell = (writer: Reader, made: { threadId: string; id: string }) =>
  run((tx) => tellAbout(tx, writer, { threadId: made.threadId, messageId: made.id }, CHURCH));

describe("a line to the church", () => {
  it("reaches whoever answers for it, at the writer's own address", async () => {
    const made = await run((tx) =>
      sendMessage(tx, mina, { to: { office: true }, body: "Is the hall free?" }));
    const told = await tell(mina, made);

    expect(told?.to.map((one) => one.userId)).toEqual([office.userId]);
    expect(told?.to[0]?.key).toBe(minaSlug);
    /* Staff read in the church's own inbox rather than the portal's. */
    expect(told?.to[0]?.office).toBe(true);
    expect(told?.heading).toBe("Mina Push");
    expect(told?.line).toBe("Is the hall free?");
  });

  it("is never addressed back to whoever wrote it", async () => {
    const made = await run((tx) =>
      sendMessage(tx, office, { to: { office: false, slug: minaSlug }, body: "It is." }));
    const told = await tell(office, made);

    expect(told?.to.map((one) => one.userId)).toEqual([mina.userId]);
    expect(told?.to.some((one) => one.userId === office.userId)).toBe(false);
  });

  it("opens the church's side for a member, and says the church wrote it", async () => {
    const made = await run((tx) =>
      sendMessage(tx, office, { to: { office: false, slug: minaSlug }, body: "Tuesday, then." }));
    const told = await tell(office, made);

    expect(told?.to[0]?.key).toBe("office");
    expect(told?.to[0]?.office).toBe(false);
    expect(told?.heading).toBe(CHURCH);
    /* The church is the heading, so the line stands on its own. */
    expect(told?.author).toBeNull();
  });
});

describe("a line into a group", () => {
  it("reaches everybody in it but the writer, headed by the group", async () => {
    const made = await run((tx) =>
      sendMessage(tx, mina, { to: { office: false, group: groupSlug }, body: "I can drive." }));
    const told = await tell(mina, made);

    expect(told?.to.map((one) => one.userId)).toEqual([pat.userId]);
    expect(told?.to[0]?.key).toBe(`group/${groupSlug}`);
    expect(told?.heading).toBe("Tuesday Night");
    /* Who typed it, because the heading is the group's name. */
    expect(told?.author).toBe("Mina Push");
  });

  it("leaves the office out until the office has written into it", async () => {
    const first = await run((tx) =>
      sendMessage(tx, pat, { to: { office: false, group: groupSlug }, body: "Thanks." }));
    expect((await tell(pat, first))?.to.some((one) => one.office)).toBe(false);

    await run((tx) =>
      sendMessage(tx, office, { to: { office: false, group: groupSlug }, body: "Hall is open." }));

    const after = await run((tx) =>
      sendMessage(tx, pat, { to: { office: false, group: groupSlug }, body: "Noted." }));
    const told = await tell(pat, after);

    expect(told?.to.some((one) => one.userId === office.userId && one.office)).toBe(true);
    expect(told?.to.every((one) => one.key === `group/${groupSlug}`)).toBe(true);
  });

  it("tells nobody where the writer is the only one there", async () => {
    const [kind] = await run((tx) => listGroupTypes(tx));
    const alone = await run((tx) =>
      createGroup(tx, { tenantId: tenant, role: "owner" }, {
        name: "Nobody Yet", typeId: kind!.id,
      } as never));
    const made = await run((tx) =>
      sendMessage(tx, office, { to: { office: false, group: alone.slug }, body: "Anyone?" }));
    expect(await tell(office, made)).toBeNull();
  });
});
