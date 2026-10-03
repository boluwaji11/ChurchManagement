/**
 * HRT-115. A new church is provisional until a human has looked at it (R1.1).
 *
 * The cap replaces an approval queue, which was built and taken out on the same
 * day. So what is tested is that the cap is real on the three things worth
 * having: a public join link, invitations, and a congregation's worth of
 * people. And that approving one lifts all three at once.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { withTenant, owner, closeConnections, type Tx } from "../src/client";
import {
  isApproved, churchStanding, requireApproved, requireRoomForPeople,
  approveChurch, unapproveChurch, PROVISIONAL_PEOPLE,
} from "../src/repo/provisional";
import { createPerson } from "../src/repo/people";
import { createInvitation } from "../src/repo/membership";
import { rotateJoinCode, churchForJoinCode } from "../src/repo/joining";
import { InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "provisionaltest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const person = (firstName: string) =>
  run((tx) =>
    createPerson(tx, as(), {
      firstName, lastName: "Provisional", lifecycleStatus: "visitor",
    } as never),
  );

beforeAll(async () => {
  // The one suite that wants the state a church is in the moment somebody
  // fills in the form. Every other suite gets an approved church.
  tenant = await testTenant(SLUG, "Provisional Test Church", { approved: false });
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("a church nobody has looked at yet", () => {
  it("starts provisional, with room for a few people", async () => {
    expect(await run((tx) => isApproved(tx, tenant))).toBe(false);

    const standing = await run((tx) => churchStanding(tx, tenant));
    expect(standing).toMatchObject({
      approved: false,
      people: 0,
      limit: PROVISIONAL_PEOPLE,
      remaining: PROVISIONAL_PEOPLE,
    });
  });

  it("works for the person who made it", async () => {
    await person("Ada");
    await person("Boma");

    const standing = await run((tx) => churchStanding(tx, tenant));
    expect(standing.people).toBe(2);
    expect(standing.remaining).toBe(PROVISIONAL_PEOPLE - 2);
  });

  it("has no public door", async () => {
    await expect(
      rotateJoinCode(tenant, "owner"),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("cannot invite anybody", async () => {
    await expect(
      createInvitation({ tenantId: tenant, email: "someone@example.org", role: "staff" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses the person past the cap, and not the one before it", async () => {
    await run((tx) => requireRoomForPeople(tx, tenant));

    await owner()`
      insert into people (tenant_id, first_name, last_name, lifecycle_status)
      select ${tenant}::uuid, 'Filler' || n, 'Provisional', 'visitor'
        from generate_series(1, ${PROVISIONAL_PEOPLE - 3}) as n`;

    const standing = await run((tx) => churchStanding(tx, tenant));
    expect(standing.people).toBe(PROVISIONAL_PEOPLE - 1);

    // Room for exactly one more.
    await run((tx) => requireRoomForPeople(tx, tenant));
    await person("Chi");

    await expect(person("Dayo")).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses an import that would go past the cap in one go", async () => {
    await expect(
      run((tx) => requireRoomForPeople(tx, tenant, 400)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("once a human has looked at it", () => {
  it("lifts the cap on people", async () => {
    await run((tx) => approveChurch(tx, tenant, "a person"));

    expect(await run((tx) => isApproved(tx, tenant))).toBe(true);
    expect(await run((tx) => churchStanding(tx, tenant))).toMatchObject({
      approved: true,
      remaining: null,
    });

    await person("Dayo");
    await run((tx) => requireApproved(tx, tenant));
  });

  it("opens the join link, and the link finds the church", async () => {
    const code = await rotateJoinCode(tenant, "owner");
    expect(await churchForJoinCode(code)).toMatchObject({ tenantId: tenant });
  });

  it("opens invitations", async () => {
    const made = await createInvitation({
      tenantId: tenant, email: "someone@example.org", role: "staff",
    });
    expect(made.id).toBeTruthy();
  });

  it("records who looked at it", async () => {
    const rows = await run((tx) =>
      tx.execute<{ approved_by: string }>(
        sql`select approved_by from tenants where id = ${tenant}::uuid`,
      ),
    );
    expect(rows[0]!.approved_by).toBe("a person");
  });
});

describe("taking it back", () => {
  it("shuts the door again and stops the code already handed out", async () => {
    const code = await rotateJoinCode(tenant, "owner");
    await run((tx) => unapproveChurch(tx, tenant));

    expect(await run((tx) => isApproved(tx, tenant))).toBe(false);
    expect(await churchForJoinCode(code)).toBeNull();
    await expect(
      run((tx) => requireApproved(tx, tenant)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});
