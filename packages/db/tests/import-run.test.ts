/**
 * HRT-28, the dry run and the commit (R19.1 to R19.3).
 *
 * The rule being tested throughout is that the preview tells the truth. A
 * preview produced by different logic from the write is a preview that can be
 * wrong, and a preview nobody trusts is worse than none, because people stop
 * reading it and then import 500 rows blind.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { plan, commit, type Plan } from "../src/import/run";
import { guessMapping } from "../src/import/columns";
import { readSheet } from "../src/import/csv";
import { listPeople, getPersonForEdit, createPerson } from "../src/repo/people";
import { createCustomField, getCustomValues } from "../src/repo/custom-fields";
import { PermissionError, type TenantRole } from "../src/roles";

let riverside: string;
let northgate: string;

const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

/** Every person these tests make carries this surname, so cleanup is exact. */
const SUR = "Importtest";

const csv = (body: string) => `First Name,Last Name,Email Address,Mobile Phone,DOB,Membership Status\n${body}`;

async function makePlan(
  tenantId: string,
  text: string,
  strategy: "skip" | "update" | "create" = "skip",
  role: TenantRole = "owner",
): Promise<Plan> {
  const sheet = readSheet(text);
  return run(tenantId, role, (tx) =>
    plan(tx, { filename: "people.csv", sheet, mapping: guessMapping(sheet.headers), strategy }),
  );
}

async function importFile(
  tenantId: string,
  text: string,
  strategy: "skip" | "update" | "create" = "skip",
  role: TenantRole = "owner",
) {
  const p = await makePlan(tenantId, text, strategy, role);
  const result = await run(tenantId, role, (tx) =>
    commit(tx, { ...as(tenantId, role) }, p),
  );
  return { plan: p, result };
}

beforeAll(async () => {
  const tenants = await owner()<{ id: string; slug: string }[]>`
    select id, slug from tenants where slug in ('riverside', 'northgate')`;
  riverside = tenants.find((t) => t.slug === "riverside")!.id;
  northgate = tenants.find((t) => t.slug === "northgate")!.id;
});

afterAll(async () => {
  await owner()`delete from import_batches where filename in ('people.csv', 'empty.csv')`;
  await owner()`delete from people where last_name = ${SUR}`;
  await owner()`delete from households where name like ${"Importtest%"}`;
  await owner()`delete from custom_fields where label like ${"Importtest%"}`;
  await closeConnections();
});

describe("the dry run writes nothing", () => {
  it("plans a create and leaves the directory alone", async () => {
    const before = await run(riverside, "owner", (tx) => listPeople(tx));
    const p = await makePlan(riverside, csv(`Ada,${SUR},ada.${SUR}@example.org,,1986-04-12,Member\n`));

    expect(p.totals).toEqual({ create: 1, update: 0, skip: 0, fail: 0 });
    expect(p.rows[0]!.person.lifecycleStatus).toBe("member");
    expect(p.rows[0]!.person.dateOfBirth).toBe("1986-04-12");

    const after = await run(riverside, "owner", (tx) => listPeople(tx));
    expect(after).toHaveLength(before.length);
  });

  it("reports the file's own line numbers, so a message points at their spreadsheet", async () => {
    const p = await makePlan(riverside, csv(`Bo,${SUR},,,,\nCal,${SUR},,,,\n`));
    expect(p.rows.map((r) => r.lineNumber)).toEqual([2, 3]);
  });
});

describe("rows that cannot be imported", () => {
  it("fails a row with no name, and says so", async () => {
    const p = await makePlan(riverside, csv(`,,nobody@example.org,,,\n`));
    expect(p.rows[0]!.outcome).toBe("fail");
    expect(p.rows[0]!.reason).toBe("import.error.noName");
  });

  it("fails a row with an impossible date rather than storing a wrong birthday", async () => {
    const p = await makePlan(riverside, csv(`Dee,${SUR},,,13/04/1990,\n`));
    expect(p.rows[0]!.outcome).toBe("fail");
    expect(p.rows[0]!.reason).toBe("import.error.badDate");
    expect(p.rows[0]!.reasonParams?.["value"]).toBe("13/04/1990");
  });

  it("records failures in the batch instead of dropping them", async () => {
    const { result } = await importFile(riverside, csv(`,,x@example.org,,,\nEve,${SUR},,,,\n`));
    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);

    const rows = await owner()<{ outcome: string; reason: string | null; line_number: number }[]>`
      select outcome, reason, line_number from import_rows where batch_id = ${result.batchId} order by line_number`;
    expect(rows.map((r) => r.outcome)).toEqual(["fail", "create"]);
    expect(rows[0]!.reason).toBe("import.error.noName");
  });
});

describe("duplicate handling (R19.3)", () => {
  const file = `Faye,${SUR},faye.${SUR}@example.org,,1990-01-01,Member\n`;

  it("skips a duplicate by default, and says which person it matched", async () => {
    await importFile(riverside, csv(file));
    const p = await makePlan(riverside, csv(file), "skip");

    expect(p.totals.skip).toBe(1);
    expect(p.rows[0]!.reason).toBe("import.skip.duplicate");
    expect(p.rows[0]!.matches[0]!.confidence).toBe("certain");
  });

  it("updates a certain match when asked to", async () => {
    await importFile(riverside, csv(`Gail,${SUR},gail.${SUR}@example.org,,,\n`));
    const { result } = await importFile(
      riverside,
      csv(`Gail,${SUR},gail.${SUR}@example.org,(512) 555 0199,1988-03-03,Member\n`),
      "update",
    );

    expect(result.updated).toBe(1);
    const [row] = await owner()<{ id: string }[]>`
      select id from people where last_name = ${SUR} and first_name = 'Gail'`;
    const saved = await run(riverside, "owner", (tx) => getPersonForEdit(tx, row!.id));
    expect(saved!.phone).toBe("(512) 555 0199");
    expect(saved!.dateOfBirth).toBe("1988-03-03");
    expect(saved!.lifecycleStatus).toBe("member");
  });

  it("will not overwrite on a merely possible match", async () => {
    await importFile(riverside, csv(`Hal,${SUR},,,,\n`));
    // Same name, no email, no birthday. That is two people as often as one.
    const p = await makePlan(riverside, csv(`Hal,${SUR},,,,\n`), "update");
    expect(p.rows[0]!.outcome).toBe("skip");
    expect(p.rows[0]!.reason).toBe("import.skip.unsure");
  });

  it("creates anyway when told to", async () => {
    await importFile(riverside, csv(`Ivy,${SUR},ivy.${SUR}@example.org,,,\n`));
    const { result } = await importFile(riverside, csv(`Ivy,${SUR},ivy.${SUR}@example.org,,,\n`), "create");
    expect(result.created).toBe(1);

    const rows = await owner()`select id from people where last_name = ${SUR} and first_name = 'Ivy'`;
    expect(rows).toHaveLength(2);
  });

  it("catches the same person appearing twice in one file", async () => {
    const p = await makePlan(
      riverside,
      csv(`Jo,${SUR},jo.${SUR}@example.org,,,\nJo,${SUR},jo.${SUR}@example.org,,,\n`),
      "skip",
    );
    // A church's export often repeats a person once per group they are in.
    // The second row must see what the first row is about to create.
    expect(p.rows[0]!.outcome).toBe("create");
    expect(p.rows[1]!.outcome).toBe("skip");
    expect(p.rows[1]!.reason).toBe("import.skip.duplicateInFile");
    expect(p.rows[1]!.reasonParams?.["line"]).toBe("2");

    const { result } = await importFile(
      riverside,
      csv(`Jo,${SUR},jo.${SUR}@example.org,,,\nJo,${SUR},jo.${SUR}@example.org,,,\n`),
      "skip",
    );
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
  });
});

describe("an update fills gaps, it does not blank fields", () => {
  it("keeps a phone number the file does not carry", async () => {
    const created = await run(riverside, "owner", (tx) =>
      createPerson(tx, as(riverside), {
        firstName: "Ken",
        lastName: SUR,
        lifecycleStatus: "member",
        email: `ken.${SUR}@example.org`,
        phone: "(512) 555 0123",
      }),
    );

    // A file with an empty phone column means "this file has no phone numbers",
    // never "delete the ones you have".
    await importFile(riverside, csv(`Ken,${SUR},ken.${SUR}@example.org,,1975-05-05,\n`), "update");

    const saved = await run(riverside, "owner", (tx) => getPersonForEdit(tx, created.id));
    expect(saved!.phone).toBe("(512) 555 0123");
    expect(saved!.dateOfBirth).toBe("1975-05-05");
  });
});

describe("what the batch records", () => {
  it("keeps the file name, the mapping, the strategy, and the totals", async () => {
    // The second row has an email but no name, so it fails rather than being
    // dropped as blank. A row of nothing but commas is blank and is ignored.
    const { result } = await importFile(riverside, csv(`Lee,${SUR},,,,\n,,orphan@example.org,,,\n`), "skip");

    const [batch] = await owner()<
      { filename: string; status: string; duplicate_strategy: string; rows_total: number; rows_created: number; rows_failed: number; mapping: Record<string, string> }[]
    >`select filename, status, duplicate_strategy, rows_total, rows_created, rows_failed, mapping
        from import_batches where id = ${result.batchId}`;

    expect(batch!.filename).toBe("people.csv");
    expect(batch!.status).toBe("committed");
    expect(batch!.duplicate_strategy).toBe("skip");
    expect(batch!.rows_total).toBe(2);
    expect(batch!.rows_created).toBe(1);
    expect(batch!.rows_failed).toBe(1);
    expect(batch!.mapping["First Name"]).toBe("firstName");
  });

  it("keeps the record as it was before an update, which is what a rollback restores", async () => {
    await importFile(riverside, csv(`Mia,${SUR},mia.${SUR}@example.org,,,\n`));
    const { result } = await importFile(
      riverside,
      csv(`Mia,${SUR},mia.${SUR}@example.org,,2001-01-01,Member\n`),
      "update",
    );

    const [row] = await owner()<{ before: { lifecycleStatus: string; dateOfBirth: string | null } }[]>`
      select before from import_rows where batch_id = ${result.batchId} and outcome = 'update'`;
    expect(row!.before.dateOfBirth).toBeNull();
    expect(row!.before.lifecycleStatus).toBe("visitor");
  });
});

describe("households and custom fields come across", () => {
  it("creates the household named in the file", async () => {
    await importFile(
      riverside,
      `First Name,Last Name,Household,Family Role\nNed,${SUR},Importtest household,Head of Household\n`,
    );
    const [person] = await owner()<{ id: string }[]>`
      select id from people where last_name = ${SUR} and first_name = 'Ned'`;
    const saved = await run(riverside, "owner", (tx) => getPersonForEdit(tx, person!.id));
    expect(saved!.householdRole).toBe("head");

    const [household] = await owner()<{ name: string }[]>`
      select h.name from households h
      join household_memberships m on m.household_id = h.id
      where m.person_id = ${person!.id}`;
    expect(household!.name).toBe("Importtest household");
  });

  it("maps a column onto a custom field and checks the value", async () => {
    const field = await run(riverside, "owner", (tx) =>
      createCustomField(tx, as(riverside), {
        entity: "person",
        label: "Importtest allergy",
        type: "text",
      }),
    );

    const text = `First Name,Last Name,Importtest allergy\nOwen,${SUR},Peanuts\n`;
    const headers = readSheet(text).headers;
    const mapping = await run(riverside, "owner", async (tx) => {
      const custom = await import("../src/repo/custom-fields").then((m) => m.listCustomFields(tx, "person"));
      return guessMapping(headers, custom);
    });
    expect(mapping["Importtest allergy"]).toBe(`cf:${field.id}`);

    const p = await run(riverside, "owner", (tx) =>
      plan(tx, { filename: "people.csv", sheet: readSheet(text), mapping, strategy: "skip" }),
    );
    await run(riverside, "owner", (tx) => commit(tx, as(riverside), p));

    const [person] = await owner()<{ id: string }[]>`
      select id from people where last_name = ${SUR} and first_name = 'Owen'`;
    const values = await run(riverside, "owner", (tx) => getCustomValues(tx, "person", person!.id));
    expect(values[field.id]).toBe("Peanuts");
  });
});

describe("who may import, and into what", () => {
  it("refuses a role that cannot edit people", async () => {
    const p = await makePlan(riverside, csv(`Pia,${SUR},,,,\n`), "skip", "pastoral");
    await expect(
      run(riverside, "pastoral", (tx) => commit(tx, as(riverside, "pastoral"), p)),
    ).rejects.toThrow(PermissionError);

    const rows = await owner()`select id from people where last_name = ${SUR} and first_name = 'Pia'`;
    expect(rows).toHaveLength(0);
  });

  it("imports into the church in context and no other", async () => {
    const { result } = await importFile(northgate, csv(`Quinn,${SUR},quinn.${SUR}@example.org,,,\n`));
    expect(result.created).toBe(1);

    const [row] = await owner()<{ tenant_id: string }[]>`
      select tenant_id from people where last_name = ${SUR} and first_name = 'Quinn'`;
    expect(row!.tenant_id).toBe(northgate);

    const here = await run(riverside, "owner", (tx) => listPeople(tx));
    expect(here.map((p) => p.firstName)).not.toContain("Quinn");
  });

  it("does not match against another church's people", async () => {
    // Quinn exists in Northgate. Importing the same person into Riverside must
    // create, not skip, because Riverside cannot see Northgate.
    const p = await makePlan(riverside, csv(`Quinn,${SUR},quinn.${SUR}@example.org,,,\n`), "skip");
    expect(p.rows[0]!.outcome).toBe("create");
    expect(p.rows[0]!.matches).toEqual([]);
  });
});
