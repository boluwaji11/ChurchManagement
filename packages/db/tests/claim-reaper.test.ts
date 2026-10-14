/**
 * HRT-344, R16.6. A claimed copy that never left goes back in the queue.
 *
 * The worker claims twenty-five copies in one statement and sends them one at a
 * time, so an invocation that runs out of time leaves the remainder marked
 * 'sending'. Those rows were invisible to everything: the due-sends count reads
 * only 'queued', so the send reported nothing waiting and was never picked up,
 * while the progress the church watched counted them as outstanding and never
 * finished. Every send larger than one batch stranded its remainder.
 *
 * The case that matters most is the one that must NOT be requeued: a copy the
 * provider already accepted. Sending that again puts a second message in
 * somebody's inbox, and a church only has to do that once to be reported.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { owner, closeConnections } from "../src/client";
import { reclaimStuck, claimBatch } from "../src/repo/email-queue";
import { wayOutForAll } from "../src/repo/email-sends";
import { createPerson } from "../src/repo/members";
import { withTenant, type Tx } from "../src/client";
import { testTenant, dropTenants } from "./helpers/tenant";

const SLUG = "hrt344-reaper";

let tenantId: string;
let sendId: string;

/** A recipient row in whatever state a test needs. */
async function copy(state: string, options: { claimedMinutesAgo?: number; ref?: string } = {}) {
  const ago = options.claimedMinutesAgo ?? null;
  const [row] = await owner()<{ id: string }[]>`
    insert into email_recipients (tenant_id, send_id, address, state, claimed_at, provider_ref)
    values (
      ${tenantId}, ${sendId}, ${`${state}-${Math.random()}@example.org`}, ${state},
      case when ${ago}::int is null then null
           else now() - make_interval(mins => ${ago}::int) end,
      ${options.ref ?? null}
    )
    returning id`;
  return row!.id;
}

async function stateOf(id: string): Promise<{ state: string; claimed: Date | null }> {
  const [row] = await owner()<{ state: string; claimed_at: Date | null }[]>`
    select state, claimed_at from email_recipients where id = ${id}`;
  return { state: row!.state, claimed: row!.claimed_at };
}

beforeAll(async () => {
  tenantId = await testTenant(SLUG, "Reaper Test Church");
});

beforeEach(async () => {
  await owner()`delete from email_recipients where tenant_id = ${tenantId}`;
  await owner()`delete from email_sends where tenant_id = ${tenantId}`;
  const [row] = await owner()<{ id: string }[]>`
    insert into email_sends (tenant_id, subject, body, audience, state)
    values (${tenantId}, 'Reaper', 'Body', 'everyone', 'sending')
    returning id`;
  sendId = row!.id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("putting right what a dead worker left", () => {
  it("puts a copy that never reached the provider back in the queue", async () => {
    const id = await copy("sending", { claimedMinutesAgo: 30 });

    const done = await reclaimStuck();

    expect(done.requeued).toBe(1);
    expect(done.finished).toBe(0);
    const after = await stateOf(id);
    expect(after.state).toBe("queued");
    /* Cleared, so a second reaping does not count it again. */
    expect(after.claimed).toBeNull();
  });

  /* The one that must never be requeued. The provider took it, so it went. */
  it("marks a copy the provider already accepted as sent, not queued", async () => {
    const id = await copy("sending", { claimedMinutesAgo: 30, ref: "resend-abc123" });

    const done = await reclaimStuck();

    expect(done.finished).toBe(1);
    expect(done.requeued).toBe(0);
    expect((await stateOf(id)).state).toBe("sent");
  });

  /* A worker still working must not be robbed of the rows it holds. */
  it("leaves a copy claimed a moment ago alone", async () => {
    const id = await copy("sending", { claimedMinutesAgo: 1 });

    const done = await reclaimStuck();

    expect(done.requeued).toBe(0);
    expect(done.finished).toBe(0);
    expect((await stateOf(id)).state).toBe("sending");
  });

  it("leaves copies that already settled alone", async () => {
    const sent = await copy("sent", { claimedMinutesAgo: 30 });
    const failed = await copy("failed", { claimedMinutesAgo: 30 });
    const queued = await copy("queued");

    const done = await reclaimStuck();

    expect(done.requeued).toBe(0);
    expect(done.finished).toBe(0);
    expect((await stateOf(sent)).state).toBe("sent");
    expect((await stateOf(failed)).state).toBe("failed");
    expect((await stateOf(queued)).state).toBe("queued");
  });

  it("says nothing happened when nothing is stuck", async () => {
    expect(await reclaimStuck()).toEqual({ requeued: 0, finished: 0 });
  });

  /* A requeued copy is claimable again, which is the whole point: the send
     resumes instead of sitting at ninety per cent for ever. */
  it("lets the next pass claim what it put back", async () => {
    await copy("sending", { claimedMinutesAgo: 30 });

    await reclaimStuck();
    const batch = await claimBatch(sendId);

    expect(batch).toHaveLength(1);
  });

  /* The claim stamps the time, which is the only thing the reaper can read. */
  it("stamps the claim time, so a stuck row can be recognised at all", async () => {
    await copy("queued");

    const batch = await claimBatch(sendId);

    expect(batch).toHaveLength(1);
    const after = await stateOf(batch[0]!.id);
    expect(after.state).toBe("sending");
    expect(after.claimed).not.toBeNull();
  });
});

/*
 * The claim used to read the person's name and their way out with a query each,
 * per recipient. They are joined into the claim now, and these are the two
 * things that go wrong when a join condition is subtly wrong: a message
 * greeting the wrong person, and a message carrying somebody else's way out.
 */
describe("what the claim brings back with each copy", () => {
  const run = <T>(work: (tx: Tx) => Promise<T>) =>
    withTenant({ tenantId, role: "owner" }, work);

  it("carries the member's own name and their own token", async () => {
    const [ada, bea] = await Promise.all(
      ["Ada", "Bea"].map((firstName) =>
        run((tx) =>
          createPerson(
            tx,
            { tenantId, role: "owner" },
            { firstName, lastName: "Claimant", lifecycleStatus: "member" },
          ),
        ).then((row) => row.id),
      ),
    );

    const who = [
      { memberId: ada!, address: "ada@example.org" },
      { memberId: bea!, address: "bea@example.org" },
    ];
    const tokens = await run((tx) => wayOutForAll(tx, { tenantId, role: "owner" }, who));

    for (const one of who) {
      await owner()`
        insert into email_recipients (tenant_id, send_id, member_id, address, state)
        values (${tenantId}, ${sendId}, ${one.memberId}, ${one.address}, 'queued')`;
    }

    const batch = await claimBatch(sendId);
    const byAddress = new Map(batch.map((row) => [row.address, row]));

    expect(batch).toHaveLength(2);
    expect(byAddress.get("ada@example.org")!.first).toBe("Ada");
    expect(byAddress.get("ada@example.org")!.name).toBe("Ada Claimant");
    expect(byAddress.get("bea@example.org")!.first).toBe("Bea");
    expect(byAddress.get("ada@example.org")!.token).toBe(tokens.get(ada!));
    expect(byAddress.get("bea@example.org")!.token).toBe(tokens.get(bea!));
    /* The thing that must never happen. */
    expect(byAddress.get("ada@example.org")!.token).not.toBe(tokens.get(bea!));
  });

  /* R16.8. Nobody behind the address, so the address stands in for the name. */
  it("falls back to the address when there is no member", async () => {
    const who = [{ memberId: null, address: "roofer@example.org" }];
    const tokens = await run((tx) => wayOutForAll(tx, { tenantId, role: "owner" }, who));

    await owner()`
      insert into email_recipients (tenant_id, send_id, member_id, address, state)
      values (${tenantId}, ${sendId}, null, 'roofer@example.org', 'queued')`;

    const [row] = await claimBatch(sendId);

    expect(row!.first).toBe("roofer@example.org");
    expect(row!.name).toBe("roofer@example.org");
    expect(row!.token).toBe(tokens.get("@roofer@example.org"));
  });
});
