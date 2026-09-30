/**
 * HRT-32. Creating a church (R1.1, R22.1).
 *
 * This is the one path that grants a membership without an invitation, and the
 * membership it grants is Owner. It also runs on the owner connection, because
 * there is no tenant context to set until the tenant exists. Both of those are
 * worth testing directly rather than trusting.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { owner, withTenant, closeConnections } from "../src/client";
import { createChurch, slugify, RESERVED_SLUGS, membershipsForUser } from "../src/repo/membership";
import { deleteTenants, deleteTenantsLike, withAuditTriggersOff } from "../src/maintenance";
import { createPerson, listPeople } from "../src/repo/people";
import { InvalidInputError } from "../src/errors";

const PREFIX = "hrt32";

/** A signed-in person who has never been in a church. */
function newcomer(name = "test") {
  const id = randomUUID();
  return { id, email: `${PREFIX}-${name}-${id.slice(0, 8)}@example.org`, fullName: "New Owner", emailVerified: true };
}

const start = (name: string, user = newcomer(), timezone = "America/Chicago") =>
  createChurch({ name: `${PREFIX} ${name}`, timezone, user });

let riverside: string;

beforeAll(async () => {
  const [row] = await owner()<{ id: string }[]>`select id from tenants where slug = 'riverside'`;
  riverside = row!.id;
});

afterAll(async () => {
  await deleteTenantsLike(PREFIX);
  // The reserved-word case cannot carry the prefix, so it is named here too, in
  // case its own cleanup did not run.
  await deleteTenants(["settings-church", "settings-2"]);
  await owner()`delete from app_users where email like ${PREFIX + "-%"}`;
  await closeConnections();
});

describe("slugs", () => {
  it("reduces a name to something that belongs in a URL", () => {
    expect(slugify("St. Mark's Riverside")).toBe("st-marks-riverside");
    expect(slugify("  Grace   Community  ")).toBe("grace-community");
    expect(slugify("!!!")).toBe("");
  });

  it("derives the slug from the name", async () => {
    const church = await start("Grace Community");
    expect(church.slug).toBe("hrt32-grace-community");
  });

  it("suffixes rather than colliding when the name is taken", async () => {
    const a = await start("Same Name");
    const b = await start("Same Name");
    const c = await start("Same Name");
    expect(new Set([a.slug, b.slug, c.slug]).size).toBe(3);
    expect(b.slug).toMatch(/-2$/);
    expect(c.slug).toMatch(/-3$/);
  });

  it("never hands out a reserved word", async () => {
    // Prefix-free, so the reserved list is actually reached.
    const user = newcomer("reserved");
    const church = await createChurch({ name: "Settings", timezone: "America/Chicago", user });
    try {
      expect(RESERVED_SLUGS).toContain("settings");
      expect(church.slug).toBe("settings-church");
    } finally {
      // Not a raw delete. Cascading a tenant away fires the audit triggers,
      // which then write rows pointing at the tenant that is going.
      await withAuditTriggersOff(async () => {
        await owner()`delete from tenants where id = ${church.tenantId}`;
      });
    }
  });
});

describe("what gets created", () => {
  it("makes the church, a primary campus, and the caller as owner, together", async () => {
    const user = newcomer("full");
    const church = await createChurch({
      name: `${PREFIX} Everything`,
      timezone: "America/Denver",
      user,
    });

    const [tenant] = await owner()<{ name: string; timezone: string }[]>`
      select name, timezone from tenants where id = ${church.tenantId}`;
    expect(tenant!.name).toBe(`${PREFIX} Everything`);
    expect(tenant!.timezone).toBe("America/Denver");

    const campuses = await owner()<{ is_primary: boolean }[]>`
      select is_primary from campuses where tenant_id = ${church.tenantId}`;
    expect(campuses).toHaveLength(1);
    expect(campuses[0]!.is_primary).toBe(true);

    const members = await owner()<{ role: string; user_id: string }[]>`
      select role, user_id from tenant_members where tenant_id = ${church.tenantId}`;
    expect(members).toHaveLength(1);
    expect(members[0]!.role).toBe("owner");
    expect(members[0]!.user_id).toBe(user.id);

    // And the app_users row exists, so the audit log can name them later.
    const users = await owner()`select id from app_users where id = ${user.id}`;
    expect(users).toHaveLength(1);
  });

  it("gives the new owner exactly one membership, their own", async () => {
    const user = newcomer("solo");
    const church = await createChurch({ name: `${PREFIX} Solo`, timezone: "America/Chicago", user });

    const memberships = await membershipsForUser(user.id);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]!.tenantId).toBe(church.tenantId);
    expect(memberships[0]!.role).toBe("owner");
  });

  it("falls back to a sane timezone rather than storing nonsense", async () => {
    const church = await start("Bad Zone", newcomer("zone"), "Mars/Olympus_Mons");
    const [tenant] = await owner()<{ timezone: string }[]>`
      select timezone from tenants where id = ${church.tenantId}`;
    expect(tenant!.timezone).toBe("America/Chicago");
  });
});

describe("what is refused", () => {
  it("refuses an unverified email address", async () => {
    const user = { ...newcomer("unverified"), emailVerified: false };
    await expect(
      createChurch({ name: `${PREFIX} Unverified`, timezone: "America/Chicago", user }),
    ).rejects.toThrow(InvalidInputError);

    const left = await owner()`select id from tenants where name = ${`${PREFIX} Unverified`}`;
    expect(left).toHaveLength(0);
  });

  it("refuses a name that is not a name", async () => {
    for (const name of ["", " ", "A"]) {
      await expect(
        createChurch({ name, timezone: "America/Chicago", user: newcomer("short") }),
      ).rejects.toThrow(InvalidInputError);
    }
  });
});

describe("a new church is isolated from the first moment", () => {
  it("cannot see the seeded church, and the seeded church cannot see it", async () => {
    const user = newcomer("isolated");
    const church = await createChurch({ name: `${PREFIX} Isolated`, timezone: "America/Chicago", user });
    const actor = { tenantId: church.tenantId, role: "owner" as const };

    await withTenant(actor, (tx) =>
      createPerson(tx, actor, { firstName: "Brand", lastName: "Newperson", lifecycleStatus: "visitor" }),
    );

    const mine = await withTenant(actor, (tx) => listPeople(tx));
    expect(mine).toHaveLength(1);
    expect(mine[0]!.lastName).toBe("Newperson");

    // Riverside has ten people and must not gain an eleventh.
    const theirs = await withTenant({ tenantId: riverside, role: "owner" }, (tx) => listPeople(tx));
    expect(theirs.map((p) => p.lastName)).not.toContain("Newperson");
  });

  it("writes rows stamped with the new church, not with anyone else's", async () => {
    const user = newcomer("stamped");
    const church = await createChurch({ name: `${PREFIX} Stamped`, timezone: "America/Chicago", user });
    const actor = { tenantId: church.tenantId, role: "owner" as const };

    const person = await withTenant(actor, (tx) =>
      createPerson(tx, actor, { firstName: "Stamped", lastName: "Newperson", lifecycleStatus: "visitor" }),
    );

    const [row] = await owner()<{ tenant_id: string }[]>`
      select tenant_id from people where id = ${person.id}`;
    expect(row!.tenant_id).toBe(church.tenantId);
    expect(row!.tenant_id).not.toBe(riverside);
  });
});
