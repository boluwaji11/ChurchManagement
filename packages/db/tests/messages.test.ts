/**
 * HRT-271. Messages with somebody on the other end (R16.9, R17.1).
 *
 * The unread rule is the part worth pinning. The office is a role rather than
 * a person, so a thread a volunteer opened by accident must not go quiet for
 * everybody else, and a thread somebody answered must not sit in their own
 * unread list.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  sendMessage, messagesIn, inboxFor, sentFor, unreadFor, threadAt,
  markThreadRead, setThreadArchived, saveDraft, draftsFor,
  type Reader,
} from "../src/repo/messages";
import { createPerson, getPerson } from "../src/repo/members";
import { InvalidInputError } from "../src/errors";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let member: string;
let slug: string;

const run = <T>(work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId: tenant, role: "owner" }, work);

/** The two readers: the church office, and the member it writes to. */
let office: Reader;
let mine: Reader;

beforeAll(async () => {
  tenant = await testTenant("inbox", "Inbox Church");
  const made = await run((tx) =>
    createPerson(tx, { tenantId: tenant, role: "owner" }, {
      firstName: "Mina", lastName: "Message", lifecycleStatus: "member",
    } as never),
  );
  member = made.id;
  const person = await run((tx) => getPerson(tx, member));
  slug = person!.slug;

  /* Two accounts, because a message records who typed it. */
  const account = async (email: string) => {
    const id = crypto.randomUUID();
    await owner()`insert into app_users (id, email) values (${id}, ${email})`;
    return id;
  };

  office = {
    tenantId: tenant, userId: await account("inbox-office@example.org"),
    memberId: null, office: true,
  };
  mine = {
    tenantId: tenant, userId: await account("inbox-member@example.org"),
    memberId: member, office: false,
  };
});

afterAll(async () => {
  await owner()`delete from app_users where email like 'inbox-%@example.org'`;
  await dropTenants("inbox");
  await closeConnections();
});

describe("a thread with the office", () => {
  it("is one a member, however many times it is written into", async () => {
    const first = await run((tx) => sendMessage(tx, mine, { to: { office: true }, body: "Is the hall free?" }));
    const again = await run((tx) => sendMessage(tx, mine, { to: { office: true }, body: "Tuesday, ideally." }));
    expect(again.threadId).toBe(first.threadId);
  });

  it("is addressed by who it is with, never by a row id", async () => {
    const [row] = await run((tx) => inboxFor(tx, mine));
    expect(row?.key).toBe("office");

    const theirs = await run((tx) => inboxFor(tx, office));
    expect(theirs[0]?.key).toBe(slug);
    expect(await run((tx) => threadAt(tx, office, slug))).not.toBeNull();
  });

  it("counts what the office has not read, and nothing it wrote itself", async () => {
    expect(await run((tx) => unreadFor(tx, office))).toBe(1);

    await run((tx) => sendMessage(tx, office, { to: { office: false, slug }, body: "It is." }));
    expect(await run((tx) => unreadFor(tx, office))).toBe(0);
    expect(await run((tx) => unreadFor(tx, mine))).toBe(1);

    const thread = await run((tx) => threadAt(tx, mine, "office"));
    await run((tx) => markThreadRead(tx, mine, thread!.id));
    expect(await run((tx) => unreadFor(tx, mine))).toBe(0);
  });

  it("reads as the church rather than as whoever typed it", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    expect(said.map((one) => one.fromOffice)).toEqual([false, false, true]);
    expect(said.at(-1)?.mine).toBe(false);
    expect(said[0]?.mine).toBe(true);
  });

  it("is in Sent for whoever wrote into it", async () => {
    expect((await run((tx) => sentFor(tx, mine))).length).toBe(1);
    expect((await run((tx) => sentFor(tx, office))).length).toBe(1);
  });

  it("comes back to the list when somebody writes into it again", async () => {
    const thread = await run((tx) => threadAt(tx, office, slug));
    await run((tx) => setThreadArchived(tx, office, thread!.id, true));
    expect(await run((tx) => inboxFor(tx, office))).toHaveLength(0);

    await run((tx) => sendMessage(tx, mine, { to: { office: true }, body: "One more thing." }));
    expect(await run((tx) => inboxFor(tx, office))).toHaveLength(1);
  });

  it("refuses a message of nothing", async () => {
    await expect(
      run((tx) => sendMessage(tx, mine, { to: { office: true }, body: "   " })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("a draft", () => {
  it("is kept until it is sent, and goes when it is", async () => {
    await run((tx) => saveDraft(tx, mine, "office", "Half a thought"));
    expect((await run((tx) => draftsFor(tx, mine)))[0]?.body).toBe("Half a thought");

    await run((tx) => sendMessage(tx, mine, { to: { office: true }, body: "The whole thought" }));
    expect(await run((tx) => draftsFor(tx, mine))).toHaveLength(0);
  });
});
