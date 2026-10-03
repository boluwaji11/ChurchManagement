/**
 * HRT-142. Bounces, and what they do to a person's record (R16.7).
 *
 * The judgement is the whole story. A 4xx is a mail server saying try later,
 * and treating that as a dead address throws away a message the church meant
 * to send. A 5xx is final, and the address has to come off the record or the
 * church keeps sending into a hole.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { classifyBounce, shouldRetry, MAX_ATTEMPTS } from "../src/repo/bounce-rules";
import {
  queueSend, listSends, getSend, nextBatch, markRecipient, bouncedAddresses,
  revalidateAddress,
} from "../src/repo/sends";
import { recipientsFor } from "../src/repo/audience";
import { saveEmailProvider } from "../src/repo/messaging";
import { createPerson } from "../src/repo/people";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "bouncestest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const draft = {
  subject: "Hello",
  body: "This week.",
  audience: { kind: "everybody" as const, id: null },
  audienceName: "Everybody",
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Bounces Test Church");

  await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Ada", lastName: "Bounces", lifecycleStatus: "member",
      email: "ada@example.org",
    } as never),
  );

  await run((tx) =>
    saveEmailProvider(tx, as(), {
      host: "smtp.example.org", port: 587, secure: false,
      username: "hello@example.org", password: "not-a-real-password",
      fromEmail: "hello@example.org", fromName: null, replyTo: null,
    }),
  );
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("reading what the server said", () => {
  it("calls a 5xx final and a 4xx worth trying again", () => {
    expect(classifyBounce("550 No such user here")).toBe("hard");
    expect(classifyBounce("451 Requested action aborted")).toBe("soft");
  });

  it("reads servers that answer in sentences", () => {
    expect(classifyBounce("Recipient address rejected: user unknown")).toBe("hard");
    expect(classifyBounce("Greylisted, please try again later")).toBe("soft");
  });

  it("calls a full mailbox soft even when it carries a 5xx", () => {
    expect(classifyBounce("552 Mailbox full")).toBe("soft");
  });

  it("guesses at nothing it does not recognise", () => {
    expect(classifyBounce("Something went wrong")).toBe("unknown");
    expect(classifyBounce(null)).toBe("unknown");
  });

  it("tries an unknown refusal again, and never tries a hard one", () => {
    expect(shouldRetry("unknown", 0)).toBe(true);
    expect(shouldRetry("soft", MAX_ATTEMPTS - 1)).toBe(true);
    expect(shouldRetry("soft", MAX_ATTEMPTS)).toBe(false);
    expect(shouldRetry("hard", 0)).toBe(false);
  });
});

describe("what a bounce does to the send", () => {
  it("leaves a soft refusal waiting for another pass", async () => {
    const queued = await run((tx) => queueSend(tx, as(), draft, "Riverside"));
    const [one] = await run((tx) => nextBatch(tx, queued.id));

    const marked = await run((tx) =>
      markRecipient(tx, one!.id, "failed", "451 Please try again later"),
    );
    expect(marked).toMatchObject({ bounce: "soft", retrying: true });

    const send = await run((tx) => getSend(tx, queued.id));
    expect(send!.progress).toMatchObject({ pending: 1, failed: 0 });
  });

  it("gives up on a soft refusal after a few goes", async () => {
    const [send] = await run((tx) => listSends(tx));
    for (let at = 1; at < MAX_ATTEMPTS; at += 1) {
      const [one] = await run((tx) => nextBatch(tx, send!.id));
      await run((tx) => markRecipient(tx, one!.id, "failed", "451 Please try again later"));
    }

    const after = await run((tx) => getSend(tx, send!.id));
    expect(after!.progress).toMatchObject({ pending: 0, failed: 1 });
  });

  it("does not take the address off the record for a soft refusal", async () => {
    expect(await run((tx) => bouncedAddresses(tx))).toHaveLength(0);
  });
});

describe("a hard bounce", () => {
  it("takes the address out of use, keeping what the server said", async () => {
    const queued = await run((tx) => queueSend(tx, as(), draft, "Riverside"));
    const [one] = await run((tx) => nextBatch(tx, queued.id));
    await run((tx) => markRecipient(tx, one!.id, "failed", "550 No such user here"));

    const bounced = await run((tx) => bouncedAddresses(tx));
    expect(bounced).toHaveLength(1);
    expect(bounced[0]).toMatchObject({
      email: "ada@example.org",
      reason: "550 No such user here",
    });
  });

  it("takes them out of every audience from then on", async () => {
    const audience = await run((tx) =>
      recipientsFor(tx, { kind: "everybody" }, "Riverside"),
    );
    expect(audience.recipients).toHaveLength(0);
    expect(audience.noEmail).toBe(1);
  });

  it("refuses to queue a send with nobody left to reach", async () => {
    await expect(
      run((tx) => queueSend(tx, as(), draft, "Riverside")),
    ).rejects.toThrow();
  });

  it("goes back into use once somebody has checked it", async () => {
    const [bounced] = await run((tx) => bouncedAddresses(tx));
    await run((tx) => revalidateAddress(tx, as(), bounced!.personId, bounced!.email));

    expect(await run((tx) => bouncedAddresses(tx))).toHaveLength(0);
    const audience = await run((tx) => recipientsFor(tx, { kind: "everybody" }, "Riverside"));
    expect(audience.recipients).toHaveLength(1);
  });
});
