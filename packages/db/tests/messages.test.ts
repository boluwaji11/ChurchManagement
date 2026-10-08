/**
 * HRT-269. Messages written here and read here (R16.9, R17.1).
 *
 * The office is a role rather than a person, so the unread rule is the part
 * worth pinning: a thread a volunteer opened by accident must not go quiet,
 * and a thread somebody answered must not sit in their own unread list.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  writeMessage, messagesIn, threadsForStaff, unreadForStaff, unreadForMember,
  markThreadRead, setThreadArchived, openThread,
} from "../src/repo/messages";
import { createPerson } from "../src/repo/members";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let member: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role, userId: null });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  tenant = await testTenant("inbox", "Inbox Church");
  const made = await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Mina", lastName: "Message", lifecycleStatus: "member",
    } as never),
  );
  member = made.id;
});

afterAll(async () => {
  await dropTenants("inbox");
  await closeConnections();
});

describe("a thread", () => {
  it("is one a member, however many times it is opened", async () => {
    const first = await run((tx) => openThread(tx, tenant, member));
    const again = await run((tx) => openThread(tx, tenant, member));
    expect(again).toBe(first);
  });

  it("carries what each side wrote, in order", async () => {
    await run((tx) =>
      writeMessage(tx, as(), { memberId: member, side: "member", body: "Is the hall free?" }),
    );
    await run((tx) =>
      writeMessage(tx, as(), { memberId: member, side: "church", body: "It is, on Tuesday." }),
    );

    const thread = await run((tx) => openThread(tx, tenant, member));
    const said = await run((tx) => messagesIn(tx, thread));
    expect(said.map((one) => one.side)).toEqual(["member", "church"]);
    expect(said[1]?.body).toBe("It is, on Tuesday.");
  });

  it("counts what the office has not read, and nothing it wrote itself", async () => {
    expect(await run((tx) => unreadForStaff(tx))).toBe(0);

    await run((tx) =>
      writeMessage(tx, as(), { memberId: member, side: "member", body: "One more thing." }),
    );
    expect(await run((tx) => unreadForStaff(tx))).toBe(1);

    const [row] = await run((tx) => threadsForStaff(tx));
    expect(row?.unread).toBe(1);
    expect(row?.lastLine).toBe("One more thing.");
    expect(row?.name).toContain("Mina");
  });

  it("counts what the member has not read", async () => {
    const mine = await run((tx) => openThread(tx, tenant, member));
    await run((tx) => markThreadRead(tx, mine, "member"));
    await run((tx) =>
      writeMessage(tx, as(), { memberId: member, side: "church", body: "Anything else?" }),
    );
    expect(await run((tx) => unreadForMember(tx, member))).toBe(1);

    const thread = await run((tx) => openThread(tx, tenant, member));
    await run((tx) => markThreadRead(tx, thread, "member"));
    expect(await run((tx) => unreadForMember(tx, member))).toBe(0);
  });

  it("goes quiet for the office once it answers", async () => {
    await run((tx) =>
      writeMessage(tx, as(), { memberId: member, side: "member", body: "Last question." }),
    );
    expect(await run((tx) => unreadForStaff(tx))).toBe(1);

    await run((tx) =>
      writeMessage(tx, as(), { memberId: member, side: "church", body: "Answered." }),
    );
    expect(await run((tx) => unreadForStaff(tx))).toBe(0);
  });

  it("comes back to the list when somebody writes into it again", async () => {
    const thread = await run((tx) => openThread(tx, tenant, member));
    await run((tx) => setThreadArchived(tx, as(), thread, true));
    expect(await run((tx) => threadsForStaff(tx))).toHaveLength(0);

    await run((tx) =>
      writeMessage(tx, as(), { memberId: member, side: "member", body: "Hello again." }),
    );
    expect(await run((tx) => threadsForStaff(tx))).toHaveLength(1);
  });

  it("refuses a message of nothing", async () => {
    await expect(
      run((tx) => writeMessage(tx, as(), { memberId: member, side: "member", body: "   " })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("does not let a member write as the church", async () => {
    await expect(
      run(
        (tx) =>
          writeMessage(tx, { tenantId: tenant, role: "member" }, {
            memberId: member, side: "church", body: "From the office",
          }),
        "member",
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
