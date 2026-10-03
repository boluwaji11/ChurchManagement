/**
 * HRT-141. The send queue (R16.6).
 *
 * A send is a record before it is an action, so the tests are about the record:
 * that bulk refuses to run on the shared allowance, that every address gets its
 * own row with the message already merged, and that stopping one leaves what
 * has gone alone.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  queueSend, listSends, getSend, sendRecipientsFor, cancelSend, dueSends,
  nextBatch, markSending, markRecipient, finishIfDone,
} from "../src/repo/sends";
import { saveEmailProvider } from "../src/repo/messaging";
import { createPerson } from "../src/repo/people";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "sendstest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const draft = {
  subject: "Hello {{first_name}}",
  body: "This week at {{church}}.",
  audience: { kind: "everybody" as const, id: null },
  audienceName: "Everybody",
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Sends Test Church");

  for (const [first, email] of [
    ["Ada", "ada@example.org"],
    ["Boma", "boma@example.org"],
    // No address, so the audience counts them and the send cannot carry them.
    ["Chi", null],
  ] as const) {
    await run((tx) =>
      createPerson(tx, as(), {
        firstName: first,
        lastName: "Sends",
        lifecycleStatus: "member",
        email,
      } as never),
    );
  }
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("queueing a send", () => {
  it("refuses while the church has no mail account of its own", async () => {
    await expect(
      run((tx) => queueSend(tx, as(), draft, "Riverside")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("queues once an account is set up, and says who it could not reach", async () => {
    await run((tx) =>
      saveEmailProvider(tx, as(), {
        host: "smtp.example.org",
        port: 587,
        secure: false,
        username: "hello@example.org",
        password: "not-a-real-password",
        fromEmail: "hello@example.org",
        fromName: "Riverside",
        replyTo: null,
      }),
    );

    const queued = await run((tx) => queueSend(tx, as(), draft, "Riverside"));
    expect(queued).toMatchObject({ recipients: 2, noEmail: 1 });
  });

  it("merges the message for each person when it is queued", async () => {
    const [send] = await run((tx) => listSends(tx));
    const rows = await run((tx) => sendRecipientsFor(tx, send!.id));

    expect(rows.map((r) => r.toEmail)).toEqual(["ada@example.org", "boma@example.org"]);
    const ada = rows.find((r) => r.toEmail === "ada@example.org")!;
    expect(ada.status).toBe("pending");

    const batch = await run((tx) => nextBatch(tx, send!.id));
    const hers = batch.find((b) => b.toEmail === "ada@example.org")!;
    expect(hers.subject).toBe("Hello Ada");
    expect(hers.body).toBe("This week at Riverside.");
  });

  it("refuses a send to nobody, and a blank subject or body", async () => {
    await expect(
      run((tx) => queueSend(tx, as(), { ...draft, subject: "  " }, "Riverside")),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      run((tx) => queueSend(tx, as(), { ...draft, body: "  " }, "Riverside")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is refused to anybody who cannot administer the church", async () => {
    await expect(
      run((tx) => queueSend(tx, as("staff"), draft, "Riverside"), "staff"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("carrying it", () => {
  let sendId: string;

  it("is due straight away when nothing was scheduled", async () => {
    const [send] = await run((tx) => listSends(tx));
    sendId = send!.id;

    expect(send!.status).toBe("scheduled");
    expect(await run((tx) => dueSends(tx))).toContain(sendId);
  });

  it("reads as sending once it starts, and counts as it goes", async () => {
    await run((tx) => markSending(tx, sendId));
    expect((await run((tx) => getSend(tx, sendId)))!.status).toBe("sending");

    const batch = await run((tx) => nextBatch(tx, sendId));
    await run((tx) => markRecipient(tx, batch[0]!.id, "sent"));

    const send = await run((tx) => getSend(tx, sendId));
    expect(send!.progress).toMatchObject({ total: 2, sent: 1, failed: 0, pending: 1 });
  });

  it("stays open while anything is still waiting", async () => {
    expect(await run((tx) => finishIfDone(tx, sendId))).toBe(false);
  });

  it("closes as sent, keeping what did not arrive and why", async () => {
    const batch = await run((tx) => nextBatch(tx, sendId));
    await run((tx) => markRecipient(tx, batch[0]!.id, "failed", "550 Mailbox unavailable"));

    expect(await run((tx) => finishIfDone(tx, sendId))).toBe(true);

    const send = await run((tx) => getSend(tx, sendId));
    expect(send!.status).toBe("sent");
    expect(send!.progress).toMatchObject({ sent: 1, failed: 1, pending: 0 });

    const failures = await run((tx) => sendRecipientsFor(tx, sendId, { status: "failed" }));
    expect(failures).toHaveLength(1);
    expect(failures[0]!.reason).toBe("550 Mailbox unavailable");
  });

  it("calls a send where nothing arrived a failed send", async () => {
    const queued = await run((tx) => queueSend(tx, as(), draft, "Riverside"));
    const batch = await run((tx) => nextBatch(tx, queued.id));
    // A 5xx, so R16.7 gives up on it rather than queueing it for another pass.
    for (const one of batch) {
      await run((tx) => markRecipient(tx, one.id, "failed", "550 No such mailbox"));
    }

    await run((tx) => finishIfDone(tx, queued.id));
    expect((await run((tx) => getSend(tx, queued.id)))!.status).toBe("failed");
  });
});

describe("stopping one", () => {
  it("stops a send that has not finished, and refuses one that has", async () => {
    // The sends above bounced hard, so R16.7 took those addresses out of use.
    // This needs somebody reachable of its own.
    await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Dayo", lastName: "Sends", lifecycleStatus: "member",
        email: "dayo@example.org",
      } as never),
    );

    const queued = await run((tx) =>
      queueSend(tx, as(), { ...draft, sendAt: "2099-01-01T10:00:00Z" }, "Riverside"),
    );

    expect(await run((tx) => dueSends(tx))).not.toContain(queued.id);

    await run((tx) => cancelSend(tx, as(), queued.id));
    expect((await run((tx) => getSend(tx, queued.id)))!.status).toBe("cancelled");

    await expect(
      run((tx) => cancelSend(tx, as(), queued.id)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});
