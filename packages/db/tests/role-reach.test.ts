/**
 * HRT-254. Nobody grants a permission they do not hold (R1.5, R1.6, R21.2).
 *
 * The rule is `onlyWhatTheyHold`, and it has now been got around twice by a
 * door nobody had thought of: once through writing a role's permissions, and
 * once through taking an archived role back off the shelf. A role that is off
 * the list grants nobody anything, so putting it back on the list is the same
 * act as writing it, and an Admin who can restore Finance has handed out
 * `giving.amounts` without ever opening the permission matrix.
 *
 * These assert the rule at every door, so the next one that is added has to
 * walk past a failing test rather than a comment.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  ensureBuiltIns, createRole, setPermissions, archiveRole, listRoles,
} from "../src/repo/tenant-roles";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;

const who = "77777777-7777-4777-8777-777777777777";
const as = (role: TenantRole) => ({ tenantId: tenant, role, userId: who });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role, userId: who }, work);

/** The one permission an Admin does not hold, which is the whole point. */
const MONEY = "giving.amounts";
/** One an Admin does hold, for the roles that are meant to be allowed. */
const PLAIN = "members.edit";

beforeAll(async () => {
  tenant = await testTenant("rolereach", "Role Reach Church");
  await owner()`
    insert into app_users (id, email, full_name)
    values (${who}, ${"reach@rolereach.example.org"}, ${"Reach Tester"})
    on conflict (id) do nothing`;
  await run((tx) => ensureBuiltIns(tx, tenant));
});

afterAll(async () => {
  await dropTenants("rolereach");
  await owner()`delete from app_users where id = ${who}`;
  await closeConnections();
});

describe("writing a role", () => {
  it("refuses a permission the writer does not hold", async () => {
    await expect(
      run((tx) => createRole(tx, as("admin"), "Treasury", [MONEY]), "admin"),
    ).rejects.toThrow(InvalidInputError);
  });

  it("lets an owner write the same role", async () => {
    const role = await run((tx) => createRole(tx, as("owner"), "Treasury", [MONEY]));
    expect(role.permissions).toContain(MONEY);
  });

  it("refuses an admin adding it to a role afterwards", async () => {
    const plain = await run((tx) => createRole(tx, as("owner"), "Greeters", [PLAIN]));
    await expect(
      run((tx) => setPermissions(tx, as("admin"), plain.id, [MONEY]), "admin"),
    ).rejects.toThrow(InvalidInputError);
  });
});

describe("taking a role back off the shelf", () => {
  it("refuses an admin restoring a role that holds more than they do", async () => {
    const role = await run((tx) => createRole(tx, as("owner"), "Counting team", [MONEY]));
    await run((tx) => archiveRole(tx, as("owner"), role.id, true));

    await expect(
      run((tx) => archiveRole(tx, as("admin"), role.id, false), "admin"),
    ).rejects.toThrow(InvalidInputError);

    /* Still off the list, so the refusal was not cosmetic. */
    const after = await run((tx) => listRoles(tx, tenant, { includeArchived: true }));
    expect(after.find((one) => one.id === role.id)?.archived).toBe(true);
  });

  it("lets an admin restore a role within their reach", async () => {
    const role = await run((tx) => createRole(tx, as("owner"), "Welcome desk", [PLAIN]));
    await run((tx) => archiveRole(tx, as("owner"), role.id, true));

    await run((tx) => archiveRole(tx, as("admin"), role.id, false), "admin");

    const after = await run((tx) => listRoles(tx, tenant, { includeArchived: true }));
    expect(after.find((one) => one.id === role.id)?.archived).toBe(false);
  });

  it("refuses an admin taking up a built-in that holds more than they do", async () => {
    const roles = await run((tx) => listRoles(tx, tenant, { includeArchived: true }));
    const finance = roles.find((one) => one.key === "finance");
    expect(finance, "the church has a Finance role on the shelf").toBeDefined();

    await expect(
      run((tx) => archiveRole(tx, as("admin"), finance!.id, false), "admin"),
    ).rejects.toThrow(InvalidInputError);
  });

  it("lets an owner take the same one up", async () => {
    const roles = await run((tx) => listRoles(tx, tenant, { includeArchived: true }));
    const finance = roles.find((one) => one.key === "finance")!;

    await run((tx) => archiveRole(tx, as("owner"), finance.id, false));

    const after = await run((tx) => listRoles(tx, tenant, { includeArchived: true }));
    expect(after.find((one) => one.id === finance.id)?.archived).toBe(false);
  });

  it("still refuses somebody who may not edit roles at all", async () => {
    const role = await run((tx) => createRole(tx, as("owner"), "Rota", [PLAIN]));
    await run((tx) => archiveRole(tx, as("owner"), role.id, true));

    await expect(
      run((tx) => archiveRole(tx, as("staff"), role.id, false), "staff"),
    ).rejects.toThrow(PermissionError);
  });
});
