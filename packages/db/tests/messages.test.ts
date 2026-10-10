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
  sendMessage, messagesIn, inboxFor, unreadFor, threadAt, react, REACTIONS,
  editMessage, deleteMessage,
  markThreadRead, setThreadArchived, saveDraft, dropDraft, draftsFor,
  type Reader,
} from "../src/repo/messages";
import { createPerson, getPerson } from "../src/repo/members";

import { createGroup, addToGroup, seedGroupTypes, listGroupTypes } from "../src/repo/groups";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
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
    /* Lines rather than conversations: two were written into this one. */
    expect(await run((tx) => unreadFor(tx, office))).toBe(2);

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

  it("comes back to the list when somebody writes into it again", async () => {
    const thread = await run((tx) => threadAt(tx, office, slug));
    await run((tx) => setThreadArchived(tx, office, thread!.id, true));
    expect(await run((tx) => inboxFor(tx, office))).toHaveLength(0);

    await run((tx) => sendMessage(tx, mine, { to: { office: true }, body: "One more thing." }));
    expect(await run((tx) => inboxFor(tx, office))).toHaveLength(1);
  });

  it("is not written to a person by a member", async () => {
    await expect(
      run((tx) => sendMessage(tx, mine, { to: { office: false, slug }, body: "Psst" })),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("refuses a message of nothing", async () => {
    await expect(
      run((tx) => sendMessage(tx, mine, { to: { office: true }, body: "   " })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

/**
 * HRT-272. A mark against a message (R16.9).
 *
 * The same press both ways, and one row a person a mark, so nobody can stack
 * the same mark twice or take off somebody else's.
 */
describe("a mark against a message", () => {
  it("goes on, counts once, and comes off again", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    const first = said.find((one) => !one.mine)!.id;
    const yes = REACTIONS[0];

    await run((tx) => react(tx, mine, first, yes));
    await run((tx) => react(tx, mine, first, yes));

    const after = await run((tx) => messagesIn(tx, mine, thread!.id));
    expect(after.find((one) => one.id === first)?.reactions).toEqual([]);

    await run((tx) => react(tx, mine, first, yes));
    const again = await run((tx) => messagesIn(tx, mine, thread!.id));
    expect(again.find((one) => one.id === first)?.reactions)
      .toEqual([{ emoji: yes, count: 1, mine: true }]);
  });

  it("is refused against the reader's own line", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    const own = said.find((one) => one.mine)!;
    await expect(
      run((tx) => react(tx, mine, own.id, REACTIONS[0])),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is refused a mark this product does not know", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    await expect(
      run((tx) => react(tx, mine, said.find((one) => !one.mine)!.id, "<script>")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

/**
 * HRT-273. Changing a line and taking one back (R16.9, R2.13).
 */
describe("a line already sent", () => {
  it("is changed only by whoever wrote it, and says so", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    const own = said.find((one) => one.mine)!;

    await expect(
      run((tx) => editMessage(tx, office, own.id, "Not mine to change")),
    ).rejects.toBeInstanceOf(PermissionError);

    await run((tx) => editMessage(tx, mine, own.id, "Tuesday, I meant"));
    const after = await run((tx) => messagesIn(tx, mine, thread!.id));
    const now = after.find((one) => one.id === own.id);
    expect(now?.body).toBe("Tuesday, I meant");
    expect(now?.edited).toBe(true);
  });

  it("is taken back without leaving a hole in the conversation", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    const own = said.find((one) => one.mine)!;

    await run((tx) => deleteMessage(tx, mine, own.id));

    const after = await run((tx) => messagesIn(tx, mine, thread!.id));
    expect(after).toHaveLength(said.length);
    const gone = after.find((one) => one.id === own.id);
    expect(gone?.deleted).toBe(true);
    expect(gone?.body).toBe("");
  });

  it("cannot be changed once it is taken back", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    const gone = said.find((one) => one.deleted)!;
    await expect(
      run((tx) => editMessage(tx, mine, gone.id, "Back again")),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

/**
 * HRT-274. Answering one line in particular (R16.9).
 */
describe("an answer to a line", () => {
  it("carries the line it answers", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    const theirs = said.find((one) => !one.mine && !one.deleted)!;

    await run((tx) =>
      sendMessage(tx, mine, {
        to: { office: true }, body: "About that", answering: theirs.id,
      }),
    );

    const after = await run((tx) => messagesIn(tx, mine, thread!.id));
    const answer = after.at(-1)!;
    expect(answer.answering?.id).toBe(theirs.id);
    expect(answer.answering?.line).toBe(theirs.body);
  });

  it("cannot answer a line in somebody else's conversation", async () => {
    const other = await run((tx) =>
      createPerson(tx, { tenantId: tenant, role: "owner" }, {
        firstName: "Elsewhere", lastName: "Entirely", lifecycleStatus: "member",
      } as never),
    );
    const them = await run((tx) => getPerson(tx, other.id));
    const theirs = await run((tx) =>
      sendMessage(tx, office, {
        to: { office: false, slug: them!.slug },
        body: "A line in another thread",
      }),
    );

    const thread = await run((tx) => threadAt(tx, mine, "office"));
    await run((tx) =>
      sendMessage(tx, mine, {
        to: { office: true }, body: "Answering across", answering: theirs.id,
      }),
    );

    const after = await run((tx) => messagesIn(tx, mine, thread!.id));
    /* The line it named is not in this conversation, so it answers nothing
       rather than quoting something the reader cannot see. */
    expect(after.at(-1)?.answering).toBeNull();
  });

  it("stands after the line it answers is taken back", async () => {
    const thread = await run((tx) => threadAt(tx, mine, "office"));
    const said = await run((tx) => messagesIn(tx, mine, thread!.id));
    const answer = said.find((one) => one.answering)!;

    await run((tx) => deleteMessage(tx, office, answer.answering!.id));

    const after = await run((tx) => messagesIn(tx, mine, thread!.id));
    const now = after.find((one) => one.id === answer.id);
    expect(now?.answering?.id).toBe(answer.answering!.id);
    expect(now?.answering?.line).toBe("");
  });
});

describe("a draft", () => {
  it("is kept until it is sent, and goes when it is", async () => {
    await run((tx) => saveDraft(tx, mine, "office", "Half a thought"));
    expect((await run((tx) => draftsFor(tx, mine)))[0]?.body).toBe("Half a thought");

    await run((tx) => sendMessage(tx, mine, { to: { office: true }, body: "The whole thought" }));
    expect(await run((tx) => draftsFor(tx, mine))).toHaveLength(0);
  });

  it("is found by the address it was written at, however it was filed", async () => {
    /* The office writes to a person by their address; the row is filed under
       their id. Both have to find it, or a sent line comes back as a draft. */
    await run((tx) => saveDraft(tx, office, slug, "To Mina"));
    expect((await run((tx) => draftsFor(tx, office)))[0]?.target).toBe(slug);

    await run((tx) => dropDraft(tx, office, slug));
    expect(await run((tx) => draftsFor(tx, office))).toHaveLength(0);
  });

  it("goes when the message it was written for is sent", async () => {
    await run((tx) => saveDraft(tx, office, slug, "Half an answer"));
    await run((tx) =>
      sendMessage(tx, office, { to: { office: false, slug }, body: "The answer" }),
    );
    expect(await run((tx) => draftsFor(tx, office))).toHaveLength(0);
  });

  it("is emptied rather than kept blank", async () => {
    await run((tx) => saveDraft(tx, mine, "office", "Something"));
    await run((tx) => saveDraft(tx, mine, "office", "   "));
    expect(await run((tx) => draftsFor(tx, mine))).toHaveLength(0);
  });
});

/**
 * HRT-270. A group's own thread (R9.7).
 *
 * Who is in it is whoever is in the group now, which is the whole point of
 * not copying the roster: a leader who adds somebody on Tuesday has added
 * them to the conversation too.
 */
describe("a group's thread", () => {
  let groupSlug: string;
  let groupId: string;
  let outsider: Reader;

  beforeAll(async () => {
    await run((tx) => seedGroupTypes(tx, { tenantId: tenant, role: "owner" }));
    const kind = (await run((tx) => listGroupTypes(tx)))[0]!.id;
    const group = await run((tx) =>
      createGroup(tx, { tenantId: tenant, role: "owner" }, {
        name: "Tuesday Night", typeId: kind,
      } as never),
    );
    groupSlug = group.slug;
    groupId = group.id;
    await run((tx) =>
      addToGroup(tx, { tenantId: tenant, role: "owner" }, {
        groupId: group.id, memberId: member, role: "leader",
      }),
    );

    const other = await run((tx) =>
      createPerson(tx, { tenantId: tenant, role: "owner" }, {
        firstName: "Otto", lastName: "Outside", lifecycleStatus: "member",
      } as never),
    );
    outsider = { tenantId: tenant, userId: mine.userId, memberId: other.id, office: false };
  });

  it("is written into by somebody in the group", async () => {
    await run((tx) =>
      sendMessage(tx, mine, { to: { office: false, group: groupSlug }, body: "Tuesday is on." }),
    );

    const theirs = await run((tx) => inboxFor(tx, mine));
    const row = theirs.find((one) => one.key === `group/${groupSlug}`);
    expect(row?.withName).toBe("Tuesday Night");
    expect(row?.lastLine).toBe("Tuesday is on.");
  });

  it("is not in the inbox of somebody who is not in the group", async () => {
    const theirs = await run((tx) => inboxFor(tx, outsider));
    expect(theirs.map((one) => one.key)).not.toContain(`group/${groupSlug}`);
    expect(await run((tx) => threadAt(tx, outsider, `group/${groupSlug}`))).toBeNull();
  });

  it("is refused to somebody who is not in the group", async () => {
    await expect(
      run((tx) =>
        sendMessage(tx, outsider, {
          to: { office: false, group: groupSlug }, body: "Let me in",
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("stays out of the office's inbox until the office writes into it", async () => {
    const before = await run((tx) => inboxFor(tx, office));
    expect(before.map((one) => one.key)).not.toContain(`group/${groupSlug}`);

    /* The office may still reach it. */
    await run((tx) =>
      sendMessage(tx, office, {
        to: { office: false, group: groupSlug }, body: "The hall is booked.",
      }),
    );

    const after = await run((tx) => inboxFor(tx, office));
    expect(after.map((one) => one.key)).toContain(`group/${groupSlug}`);
  });

  it("goes quiet for somebody who has read it", async () => {
    const thread = await run((tx) => threadAt(tx, mine, `group/${groupSlug}`));
    await run((tx) => markThreadRead(tx, mine, thread!.id));

    const theirs = await run((tx) => inboxFor(tx, mine));
    expect(theirs.find((one) => one.key === `group/${groupSlug}`)?.unread).toBe(0);
  });

  it("reaches whoever joins afterwards", async () => {
    const group = await run((tx) => threadAt(tx, mine, `group/${groupSlug}`));
    expect(group).not.toBeNull();

    await run((tx) =>
      addToGroup(tx, { tenantId: tenant, role: "owner" }, {
        groupId, memberId: outsider.memberId!,
      }),
    );

    const theirs = await run((tx) => inboxFor(tx, outsider));
    expect(theirs.map((one) => one.key)).toContain(`group/${groupSlug}`);
    /* Everything said before they joined, which is what a group thread is
       for: the history is the group's, not each member's. */
    expect(theirs.find((one) => one.key === `group/${groupSlug}`)?.unread).toBe(2);
  });
});

describe("what a tick says", () => {
  it("leaves a line unmarked until somebody else has opened it", async () => {
    const made = await run((tx) =>
      sendMessage(tx, office, { to: { office: false, slug }, body: "Have you a moment?" }));

    const mine = await run((tx) => messagesIn(tx, office, made.threadId));
    const line = mine.find((one) => one.id === made.id);
    expect(line?.mine).toBe(true);
    expect(line?.readByOthers).toBe(false);
  });

  it("marks it once the other side has read the thread", async () => {
    const made = await run((tx) =>
      sendMessage(tx, office, { to: { office: false, slug }, body: "Tuesday suits." }));

    await run((tx) => markThreadRead(tx, mine, made.threadId));

    const theirs = await run((tx) => messagesIn(tx, office, made.threadId));
    expect(theirs.find((one) => one.id === made.id)?.readByOthers).toBe(true);
  });

  it("never counts the writer's own reading as somebody else's", async () => {
    const made = await run((tx) =>
      sendMessage(tx, mine, { to: { office: true }, body: "Thank you." }));

    /* The member opens their own thread again, which is not the office
       reading it. */
    await run((tx) => markThreadRead(tx, mine, made.threadId));

    const ours = await run((tx) => messagesIn(tx, mine, made.threadId));
    const line = ours.find((one) => one.id === made.id);
    expect(line?.mine).toBe(true);
    expect(line?.readByOthers).toBe(false);
  });
});

/**
 * HRT-280. What is sent with a line (R16.14).
 *
 * The bytes are already in the ledger when the line is written: the upload
 * path checks the type, the size and the church's quota before anything is
 * stored, so this is only about what the line carries and what happens to it
 * when the line is taken back.
 */
describe("what is sent with a line", () => {
  /** A row in the ledger, as the upload path would have left one. */
  const stored = async (name: string): Promise<string> => {
    const [row] = await owner()<{ id: string }[]>`
      insert into stored_files (tenant_id, bucket, key, purpose, content_type, bytes)
      values (${tenant}, 'church', ${`inbox/message/${name}`}, 'message', 'image/png', 1024)
      returning id`;
    return row!.id;
  };

  it("carries the files it was sent with, in the order they were chosen", async () => {
    const first = await stored(`one-${Date.now()}.png`);
    const second = await stored(`two-${Date.now()}.png`);

    const made = await run((tx) =>
      sendMessage(tx, office, {
        to: { office: false, slug },
        body: "The rota, and the hall.",
        files: [
          { id: first, label: "rota.png" },
          { id: second, label: "hall.png" },
        ],
      }));

    const said = await run((tx) => messagesIn(tx, office, made.threadId));
    const line = said.find((one) => one.id === made.id);
    expect(line?.files.map((f) => f.label)).toEqual(["rota.png", "hall.png"]);
    expect(line?.files[0]!.contentType).toBe("image/png");
  });

  it("takes a line that is only a file", async () => {
    const only = await stored(`only-${Date.now()}.png`);
    const made = await run((tx) =>
      sendMessage(tx, office, {
        to: { office: false, slug },
        body: "",
        files: [{ id: only, label: "notice.png" }],
      }));

    const said = await run((tx) => messagesIn(tx, office, made.threadId));
    expect(said.find((one) => one.id === made.id)?.files).toHaveLength(1);
  });

  it("refuses a line with neither words nor a file", async () => {
    await expect(
      run((tx) => sendMessage(tx, office, { to: { office: false, slug }, body: "   " })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("lets go of them when the line is taken back", async () => {
    const one = await stored(`gone-${Date.now()}.png`);
    const made = await run((tx) =>
      sendMessage(tx, office, {
        to: { office: false, slug },
        body: "Never mind.",
        files: [{ id: one, label: "draft.png" }],
      }));

    await run((tx) => deleteMessage(tx, office, made.id));

    const said = await run((tx) => messagesIn(tx, office, made.threadId));
    expect(said.find((row) => row.id === made.id)?.files).toEqual([]);

    /* The bytes stay in the ledger, where the quota and the audit can still
       see them. */
    const [held] = await owner()<{ n: string }[]>`
      select count(*)::text as n from stored_files where id = ${one}`;
    expect(held!.n).toBe("1");
  });

  it("ignores a file this church does not hold", async () => {
    const made = await run((tx) =>
      sendMessage(tx, office, {
        to: { office: false, slug },
        body: "Nothing attached.",
        files: [{ id: "00000000-0000-4000-8000-000000000000", label: "ghost.png" }],
      }));

    const said = await run((tx) => messagesIn(tx, office, made.threadId));
    expect(said.find((one) => one.id === made.id)?.files).toEqual([]);
  });
});
