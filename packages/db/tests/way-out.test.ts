/**
 * HRT-343, R16.8. Every recipient's own way out of a church's mailing list.
 *
 * The property that matters is not that a token appears. It is that each
 * person's token is theirs and stays theirs: a link in a message sent last year
 * has to take the same person off, and two people must never be handed the same
 * token, because one of them would unsubscribe the other.
 *
 * Minting these one person at a time cost a round trip each, so this is the
 * batched version and these tests are what says it kept the old behaviour.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { wayOutForAll, wayOutKey } from "../src/repo/email-sends";
import { createPerson } from "../src/repo/members";
import { testTenant, dropTenants } from "./helpers/tenant";

const SLUG = "hrt343-wayout";

let tenantId: string;

const actor = () => ({ tenantId, role: "owner" as const });
const run = <T>(work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role: "owner" }, work);

async function person(firstName: string): Promise<string> {
  const row = await run((tx) =>
    createPerson(tx, actor(), { firstName, lastName: "Wayout", lifecycleStatus: "member" }),
  );
  return row.id;
}

beforeAll(async () => {
  tenantId = await testTenant(SLUG, "Way Out Test Church");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("minting a way out for a whole audience", () => {
  it("gives every member their own token, and no two the same", async () => {
    const ids = await Promise.all(["Ada", "Bea", "Cal", "Dot"].map(person));
    const who = ids.map((memberId) => ({ memberId, address: `${memberId}@example.org` }));

    const tokens = await run((tx) => wayOutForAll(tx, actor(), who));

    expect(tokens.size).toBe(4);
    for (const one of who) {
      const token = tokens.get(wayOutKey(one));
      expect(token).toBeTruthy();
      expect(token!.length).toBeGreaterThan(20);
    }
    expect(new Set(tokens.values()).size).toBe(4);
  });

  /* The whole point of keeping the token: a link in last year's message still
     takes the same person off the list. */
  it("hands back the same token the second time it is asked", async () => {
    const memberId = await person("Eve");
    const who = [{ memberId, address: "eve@example.org" }];

    const first = await run((tx) => wayOutForAll(tx, actor(), who));
    const again = await run((tx) => wayOutForAll(tx, actor(), who));

    expect(again.get(wayOutKey(who[0]!))).toBe(first.get(wayOutKey(who[0]!)));
  });

  /* R16.8. A roofer, a county office, a visiting speaker: written to, on no
     list, and still owed a way out. */
  it("covers an address with nobody behind it", async () => {
    const memberId = await person("Fay");
    const who = [
      { memberId, address: "fay@example.org" },
      { memberId: null, address: "roofer@example.org" },
    ];

    const tokens = await run((tx) => wayOutForAll(tx, actor(), who));

    expect(tokens.get(memberId)).toBeTruthy();
    expect(tokens.get("@roofer@example.org")).toBeTruthy();
    expect(tokens.get(memberId)).not.toBe(tokens.get("@roofer@example.org"));
  });

  it("asks once for an address written two ways", async () => {
    const who = [
      { memberId: null, address: "Twice@Example.org" },
      { memberId: null, address: "  twice@example.org " },
    ];

    const tokens = await run((tx) => wayOutForAll(tx, actor(), who));

    expect(tokens.size).toBe(1);
    expect(tokens.get("@twice@example.org")).toBeTruthy();
  });

  it("keeps a loose address's token across sends", async () => {
    const who = [{ memberId: null, address: "speaker@example.org" }];

    const first = await run((tx) => wayOutForAll(tx, actor(), who));
    const again = await run((tx) => wayOutForAll(tx, actor(), who));

    expect(again.get("@speaker@example.org")).toBe(first.get("@speaker@example.org"));
  });

  /* A consent row written by a form carries no token until a send needs one, so
     the row is filled rather than duplicated. */
  it("fills a consent row that was captured without a token", async () => {
    const memberId = await person("Gus");

    await run((tx) =>
      tx.execute(sql`
        insert into contact_consent (tenant_id, member_id, channel, state, source)
        values (${tenantId}::uuid, ${memberId}::uuid, 'email', 'granted', 'form')
      `),
    );

    const tokens = await run((tx) =>
      wayOutForAll(tx, actor(), [{ memberId, address: "gus@example.org" }]),
    );

    expect(tokens.get(memberId)).toBeTruthy();

    const found = (await run((tx) =>
      tx.execute(sql`
        select state, token from contact_consent
         where tenant_id = ${tenantId}::uuid and member_id = ${memberId}::uuid
      `),
    )) as unknown as { state: string; token: string }[];

    expect(found).toHaveLength(1);
    expect(found[0]!.token).toBe(tokens.get(memberId));
    /* The form's answer is the record a regulator reads. Minting must not
       overwrite it. */
    expect(found[0]!.state).toBe("granted");
  });

  it("asks for nothing when there is nobody to ask for", async () => {
    const tokens = await run((tx) => wayOutForAll(tx, actor(), []));
    expect(tokens.size).toBe(0);
  });
});
