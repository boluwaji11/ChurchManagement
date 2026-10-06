/**
 * HRT-29. Undoing an import (R19.4).
 *
 * The case: a spreadsheet imported at 9pm on a Saturday with the columns shifted
 * by one, noticed on Sunday morning. What matters is that undoing it is one
 * operation, that it puts updated members back exactly, and that it does not
 * throw away work somebody has done since.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { plan, commit } from "../src/import/run";
import { rollbackImport, listImports, ROLLBACK_WINDOW_DAYS } from "../src/import/rollback";
import { guessMapping } from "../src/import/columns";
import { readSheet } from "../src/import/csv";
import { getPersonForEdit, updatePerson, listPeople } from "../src/repo/members";
import { PermissionError, type TenantRole } from "../src/roles";
import { InvalidInputError } from "../src/errors";

let riverside: string;
const SUR = "Rollbacktest";
const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

const csv = (body: string) => `First Name,Last Name,Email Address,DOB,Membership Status\n${body}`;

async function importFile(text: string, strategy: "skip" | "update" | "create" = "skip") {
  const sheet = readSheet(text);
  const p = await run(riverside, "owner", (tx) =>
    plan(tx, { filename: "rollback.csv", sheet, mapping: guessMapping(sheet.headers), strategy, tenantId: riverside }),
  );
  return run(riverside, "owner", (tx) => commit(tx, as(riverside), p));
}

beforeAll(async () => {
  const [row] = await owner()<{ id: string }[]>`select id from tenants where slug = 'riverside'`;
  riverside = row!.id;
});

afterAll(async () => {
  await owner()`delete from import_batches where filename = 'rollback.csv'`;
  await owner()`delete from members where last_name = ${SUR}`;
  await closeConnections();
});

describe("undoing an import", () => {
  it("removes the members it added", async () => {
    const batch = await importFile(csv(`Ava,${SUR},ava.${SUR}@example.org,,\nBen,${SUR},ben.${SUR}@example.org,,\n`));
    expect(batch.created).toBe(2);

    const result = await run(riverside, "owner", (tx) => rollbackImport(tx, as(riverside), batch.batchId));
    expect(result.removed).toBe(2);

    const left = await owner()`select id from members where last_name = ${SUR}`;
    expect(left).toHaveLength(0);
  });

  it("puts an updated person back exactly as they were", async () => {
    const first = await importFile(csv(`Cara,${SUR},cara.${SUR}@example.org,,\n`));
    expect(first.created).toBe(1);

    const [person] = await owner()<{ id: string }[]>`
      select id from members where last_name = ${SUR} and first_name = 'Cara'`;
    const before = await run(riverside, "owner", (tx) => getPersonForEdit(tx, person!.id));

    const second = await importFile(
      csv(`Cara,${SUR},cara.${SUR}@example.org,1991-02-02,Member\n`),
      "update",
    );
    expect(second.updated).toBe(1);

    const changed = await run(riverside, "owner", (tx) => getPersonForEdit(tx, person!.id));
    expect(changed!.dateOfBirth).toBe("1991-02-02");
    expect(changed!.lifecycleStatus).toBe("member");

    const result = await run(riverside, "owner", (tx) => rollbackImport(tx, as(riverside), second.batchId));
    expect(result.restored).toBe(1);

    const after = await run(riverside, "owner", (tx) => getPersonForEdit(tx, person!.id));
    expect(after!.dateOfBirth).toBe(before!.dateOfBirth);
    expect(after!.lifecycleStatus).toBe(before!.lifecycleStatus);
  });

  it("archives rather than removes somebody who was edited after the import", async () => {
    const batch = await importFile(csv(`Dana,${SUR},dana.${SUR}@example.org,,\n`));
    const [person] = await owner()<{ id: string }[]>`
      select id from members where last_name = ${SUR} and first_name = 'Dana'`;

    // Somebody has been working on this record. It is theirs now, not the file's.
    await run(riverside, "owner", (tx) =>
      updatePerson(tx, as(riverside), person!.id, {
        firstName: "Dana",
        lastName: SUR,
        lifecycleStatus: "member",
        phone: "(512) 555 0164",
      }),
    );

    const result = await run(riverside, "owner", (tx) => rollbackImport(tx, as(riverside), batch.batchId));
    expect(result.archived).toBe(1);
    expect(result.removed).toBe(0);

    const [still] = await owner()<{ archived_at: Date | null }[]>`
      select archived_at from members where id = ${person!.id}`;
    expect(still).toBeDefined();
    expect(still!.archived_at).not.toBeNull();
  });

  it("leaves the directory as it was before the import ran", async () => {
    const before = await run(riverside, "owner", (tx) => listPeople(tx));
    const batch = await importFile(csv(`Erin,${SUR},erin.${SUR}@example.org,,\nFinn,${SUR},finn.${SUR}@example.org,,\n`));
    await run(riverside, "owner", (tx) => rollbackImport(tx, as(riverside), batch.batchId));
    const after = await run(riverside, "owner", (tx) => listPeople(tx));
    expect(after.length).toBe(before.length);
  });
});

describe("what is refused", () => {
  it("refuses to undo the same import twice", async () => {
    const batch = await importFile(csv(`Gus,${SUR},gus.${SUR}@example.org,,\n`));
    await run(riverside, "owner", (tx) => rollbackImport(tx, as(riverside), batch.batchId));

    await expect(
      run(riverside, "owner", (tx) => rollbackImport(tx, as(riverside), batch.batchId)),
    ).rejects.toThrow(InvalidInputError);
  });

  it("refuses after thirty days", async () => {
    const batch = await importFile(csv(`Hana,${SUR},hana.${SUR}@example.org,,\n`));
    await owner()`
      update import_batches set committed_at = now() - interval '31 days' where id = ${batch.batchId}`;

    await expect(
      run(riverside, "owner", (tx) => rollbackImport(tx, as(riverside), batch.batchId)),
    ).rejects.toThrow(/30 days/);

    // And the members it added are still there.
    const left = await owner()`select id from members where last_name = ${SUR} and first_name = 'Hana'`;
    expect(left).toHaveLength(1);
  });

  it("refuses a role that may edit but may not archive", async () => {
    const batch = await importFile(csv(`Ida,${SUR},ida.${SUR}@example.org,,\n`));

    // Staff can import. Undoing one can remove hundreds of members at once, so it
    // sits with the roles that may archive.
    await expect(
      run(riverside, "staff", (tx) => rollbackImport(tx, as(riverside, "staff"), batch.batchId)),
    ).rejects.toThrow(PermissionError);

    const left = await owner()`select id from members where last_name = ${SUR} and first_name = 'Ida'`;
    expect(left).toHaveLength(1);
  });
});

describe("the list of past imports", () => {
  it("says which can still be undone", async () => {
    const fresh = await importFile(csv(`Jane,${SUR},jane.${SUR}@example.org,,\n`));
    const old = await importFile(csv(`Kyle,${SUR},kyle.${SUR}@example.org,,\n`));
    await owner()`
      update import_batches set committed_at = now() - interval '${owner().unsafe("40")} days' where id = ${old.batchId}`;

    const list = await run(riverside, "owner", (tx) => listImports(tx));
    expect(list.find((b) => b.id === fresh.batchId)?.canRollBack).toBe(true);
    expect(list.find((b) => b.id === old.batchId)?.canRollBack).toBe(false);
  });

  it("states the window rather than leaving it to be discovered", () => {
    expect(ROLLBACK_WINDOW_DAYS).toBe(30);
  });
});
