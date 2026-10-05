/**
 * HRT-21. Writing a person (R2.1 to R2.3, R2.5, R2.11, R2.13).
 *
 * Three things are being proved, and only the first is about the feature working.
 *
 *   1. A write does what it says: fields, contact methods, household membership.
 *   2. A role that may not write is refused in the repository, not in the page.
 *   3. A write cannot reach another church, and the audit log records who did it.
 *
 * Runs against the real database as the real application role, like the rest of
 * the suite, because a permission check that passes against a mock has proved
 * nothing about Postgres.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections } from "../src/client";
import {
  createPerson, updatePerson, setPersonArchived, getPersonForEdit, listPeople, peopleToInvite,
  type PersonInput,
} from "../src/repo/members";
import { PermissionError, type TenantRole } from "../src/roles";

let riverside: string;
let northgate: string;
const created: string[] = [];

/** A minimal valid person. Individual tests override what they care about. */
const draft = (over: Partial<PersonInput> = {}): PersonInput => ({
  firstName: "Test",
  lastName: "Writeperson",
  lifecycleStatus: "visitor",
  ...over,
});

const as = (tenantId: string, role: TenantRole) => ({ tenantId, role });

async function add(tenantId: string, role: TenantRole, input: PersonInput) {
  const row = await withTenant({ tenantId, role }, (tx) => createPerson(tx, as(tenantId, role), input));
  created.push(row.id);
  return row.id;
}

beforeAll(async () => {
  const tenants = await owner()<{ id: string; slug: string }[]>`
    select id, slug from tenants where slug in ('riverside', 'northgate')`;
  riverside = tenants.find((t) => t.slug === "riverside")!.id;
  northgate = tenants.find((t) => t.slug === "northgate")!.id;
});

afterAll(async () => {
  // Households created by these tests are named distinctly so the cleanup is exact.
  await owner()`delete from members where last_name in ('Writeperson', 'Movedperson')`;
  await owner()`delete from households where name like ${"HRT21 %"}`;
  await closeConnections();
});

describe("adding a person", () => {
  it("saves the person, the primary email, and the primary phone", async () => {
    const id = await add(riverside, "owner", draft({
      firstName: "Rebecca",
      preferredName: "Becky",
      email: "rebecca.writeperson@example.org",
      phone: "(512) 555 0173",
      dateOfBirth: "1990-03-14",
      lifecycleStatus: "member",
      membershipDate: "2021-09-05",
    }));

    const saved = await withTenant({ tenantId: riverside, role: "owner" }, (tx) => getPersonForEdit(tx, id));
    expect(saved).not.toBeNull();
    expect(saved!.firstName).toBe("Rebecca");
    expect(saved!.preferredName).toBe("Becky");
    expect(saved!.email).toBe("rebecca.writeperson@example.org");
    expect(saved!.phone).toBe("(512) 555 0173");
    expect(saved!.lifecycleStatus).toBe("member");
    expect(saved!.membershipDate).toBe("2021-09-05");
  });

  it("creates a named household and puts the person in it", async () => {
    const id = await add(riverside, "admin", draft({
      firstName: "Evan",
      householdName: "HRT21 The Writeperson family",
      householdRole: "head",
    }));

    const saved = await withTenant({ tenantId: riverside, role: "admin" }, (tx) => getPersonForEdit(tx, id));
    expect(saved!.householdId).toBeTruthy();
    expect(saved!.householdRole).toBe("head");

    const [household] = await owner()<{ name: string; tenant_id: string }[]>`
      select name, tenant_id from households where id = ${saved!.householdId!}`;
    expect(household!.name).toBe("HRT21 The Writeperson family");
    // The household belongs to the church that created it, not to whoever asked.
    expect(household!.tenant_id).toBe(riverside);
  });

  it("stamps the row with the tenant in context", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Nora" }));
    const [row] = await owner()<{ tenant_id: string }[]>`select tenant_id from members where id = ${id}`;
    expect(row!.tenant_id).toBe(riverside);
  });
});

describe("editing a person", () => {
  it("corrects a phone number in place rather than leaving two rows behind", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Aaron", phone: "(512) 555 0100" }));

    await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      updatePerson(tx, as(riverside, "owner"), id, draft({ firstName: "Aaron", phone: "(512) 555 0199" })),
    );

    const rows = await owner()<{ value: string }[]>`
      select value from contact_methods where member_id = ${id} and kind = 'phone'`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe("(512) 555 0199");
  });

  it("removes a contact method when the field is cleared", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Paula", email: "paula.writeperson@example.org" }));

    await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      updatePerson(tx, as(riverside, "owner"), id, draft({ firstName: "Paula", email: null })),
    );

    const rows = await owner()`select id from contact_methods where member_id = ${id} and kind = 'email'`;
    expect(rows).toHaveLength(0);
  });

  it("ends the old household membership instead of deleting it", async () => {
    const id = await add(riverside, "owner", draft({
      lastName: "Movedperson",
      householdName: "HRT21 First household",
      householdRole: "child",
    }));

    await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      updatePerson(tx, as(riverside, "owner"), id, draft({
        lastName: "Movedperson",
        householdName: "HRT21 Second household",
        householdRole: "head",
      })),
    );

    const rows = await owner()<{ ended_on: string | null }[]>`
      select ended_on from household_memberships where member_id = ${id} order by created_at`;
    expect(rows).toHaveLength(2);
    expect(rows[0]!.ended_on).not.toBeNull();
    expect(rows[1]!.ended_on).toBeNull();
  });
});

describe("archiving", () => {
  it("takes the person out of the directory and puts them back", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Marcus" }));

    await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      setPersonArchived(tx, as(riverside, "owner"), id, true),
    );

    const visible = await withTenant({ tenantId: riverside, role: "owner" }, (tx) => listPeople(tx));
    expect(visible.map((p) => p.id)).not.toContain(id);

    const all = await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      listPeople(tx, { includeArchived: true }),
    );
    expect(all.map((p) => p.id)).toContain(id);

    await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      setPersonArchived(tx, as(riverside, "owner"), id, false),
    );

    const back = await withTenant({ tenantId: riverside, role: "owner" }, (tx) => listPeople(tx));
    expect(back.map((p) => p.id)).toContain(id);
  });

  it("keeps the row. Archive is not delete.", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Deborah" }));
    await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      setPersonArchived(tx, as(riverside, "owner"), id, true),
    );
    const rows = await owner()`select id from members where id = ${id}`;
    expect(rows).toHaveLength(1);
  });
});

describe("who may write", () => {
  it("refuses a member, a pastoral role, and a check-in volunteer", async () => {
    for (const role of ["member", "pastoral", "checkin_volunteer"] as TenantRole[]) {
      await expect(
        withTenant({ tenantId: riverside, role }, (tx) =>
          createPerson(tx, as(riverside, role), draft({ firstName: "Refused" })),
        ),
      ).rejects.toThrow(PermissionError);
    }
  });

  it("lets staff edit and refuses staff the archive", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Hannah" }));

    await withTenant({ tenantId: riverside, role: "staff" }, (tx) =>
      updatePerson(tx, as(riverside, "staff"), id, draft({ firstName: "Hanna" })),
    );

    const saved = await withTenant({ tenantId: riverside, role: "staff" }, (tx) => getPersonForEdit(tx, id));
    expect(saved!.firstName).toBe("Hanna");

    await expect(
      withTenant({ tenantId: riverside, role: "staff" }, (tx) =>
        setPersonArchived(tx, as(riverside, "staff"), id, true),
      ),
    ).rejects.toThrow(PermissionError);
  });

  it("refuses before it writes, so nothing is left behind", async () => {
    const before = await owner()<{ n: string }[]>`
      select count(*) as n from members where tenant_id = ${riverside}`;
    await expect(
      withTenant({ tenantId: riverside, role: "member" }, (tx) =>
        createPerson(tx, as(riverside, "member"), draft({ firstName: "Nothing" })),
      ),
    ).rejects.toThrow(PermissionError);
    const after = await owner()<{ n: string }[]>`
      select count(*) as n from members where tenant_id = ${riverside}`;
    expect(after[0]!.n).toBe(before[0]!.n);
  });
});

describe("a write cannot cross a church boundary", () => {
  it("cannot edit another church's person, even with its id in hand", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Isolated" }));

    await expect(
      withTenant({ tenantId: northgate, role: "owner" }, (tx) =>
        updatePerson(tx, as(northgate, "owner"), id, draft({ firstName: "Stolen" })),
      ),
    ).rejects.toThrow(/No such person/);

    const still = await owner()<{ first_name: string }[]>`select first_name from members where id = ${id}`;
    expect(still[0]!.first_name).toBe("Isolated");
  });

  it("cannot archive another church's person", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Untouchable" }));

    await expect(
      withTenant({ tenantId: northgate, role: "owner" }, (tx) =>
        setPersonArchived(tx, as(northgate, "owner"), id, true),
      ),
    ).rejects.toThrow(/No such person/);

    const [row] = await owner()<{ archived_at: Date | null }[]>`
      select archived_at from members where id = ${id}`;
    expect(row!.archived_at).toBeNull();
  });
});

describe("the audit log", () => {
  it("records the insert with the actor and their role", async () => {
    const userId = (await owner()<{ id: string }[]>`
      select id from app_users where email = 'pastor@riverside.example.org'`)[0]!.id;

    const id = await withTenant(
      { tenantId: riverside, role: "owner", userId, ip: "198.51.100.7" },
      (tx) => createPerson(tx, as(riverside, "owner"), draft({ firstName: "Audited" })),
    ).then((r) => {
      created.push(r.id);
      return r.id;
    });

    const [entry] = await owner()<
      { action: string; actor_role: string; actor_user_id: string; ip: string; after: { first_name: string } }[]
    >`select action, actor_role, actor_user_id, ip, after
        from audit_entries where entity = 'members' and entity_id = ${id} and action = 'insert'`;

    expect(entry).toBeDefined();
    expect(entry!.action).toBe("insert");
    expect(entry!.actor_role).toBe("owner");
    expect(entry!.actor_user_id).toBe(userId);
    expect(entry!.ip).toBe("198.51.100.7");
    expect(entry!.after.first_name).toBe("Audited");
  });

  it("records an edit with both the before and the after", async () => {
    const id = await add(riverside, "owner", draft({ firstName: "Before" }));

    await withTenant({ tenantId: riverside, role: "admin" }, (tx) =>
      updatePerson(tx, as(riverside, "admin"), id, draft({ firstName: "After" })),
    );

    const [entry] = await owner()<
      { before: { first_name: string }; after: { first_name: string }; actor_role: string }[]
    >`select before, after, actor_role
        from audit_entries
       where entity = 'members' and entity_id = ${id} and action = 'update'
       order by at desc limit 1`;

    expect(entry!.before.first_name).toBe("Before");
    expect(entry!.after.first_name).toBe("After");
    expect(entry!.actor_role).toBe("admin");
  });
});

/**
 * R1.7. The directory is where the members a church gives an account to come
 * from, so the picker has to offer the right ones and leave out the rest.
 */
describe("members a church could give an account to (R1.7)", () => {
  it("offers somebody with an email and leaves out somebody without one", async () => {
    const withEmail = await add(riverside, "owner", draft({
      firstName: "Marta",
      email: "marta.writeperson@example.org",
    }));
    const without = await add(riverside, "owner", draft({ firstName: "Silent" }));

    const found = await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      peopleToInvite(tx, "Writeperson"),
    );

    expect(found.find((one) => one.id === withEmail)?.email)
      .toBe("marta.writeperson@example.org");
    expect(found.some((one) => one.id === without)).toBe(false);
  });

  it("never reaches another church", async () => {
    const theirs = await add(northgate, "owner", draft({
      firstName: "Elsewhere",
      email: "elsewhere.writeperson@example.org",
    }));

    const found = await withTenant({ tenantId: riverside, role: "owner" }, (tx) =>
      peopleToInvite(tx, "Writeperson"),
    );

    expect(found.some((one) => one.id === theirs)).toBe(false);
  });
});
