/**
 * HRT-111. Campus and the places inside it (R1.2).
 *
 * The UI is single-campus and says nothing about campuses, so what is tested is
 * that the schema carries the shape anyway: every record that belongs somewhere
 * gets a campus without anybody choosing one, because a column of nulls is
 * nothing for a later multi-campus release to work from.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  primaryCampus, listCampuses, renameCampus,
  listLocations, addLocation, renameLocation, removeLocation,
} from "../src/repo/campuses";
import { createPerson } from "../src/repo/members";
import { addSpecialService } from "../src/repo/services";
import { createGroup, seedGroupTypes, listGroupTypes } from "../src/repo/groups";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let campus: string;
const SLUG = "campusestest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Campuses Test Church");
  // testTenant inserts the church directly, so give it the campus that
  // createChurch would have made.
  await run((tx) =>
    tx.execute(sql`
      insert into campuses (tenant_id, name, is_primary)
      values (${tenant}::uuid, ${"Campuses Test Church"}, true)`),
  );
  campus = (await run((tx) => primaryCampus(tx)))!.id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("the campus every record belongs to", () => {
  it("exists from the first moment, and is the primary one", async () => {
    const found = await run((tx) => primaryCampus(tx));
    expect(found).toMatchObject({ name: "Campuses Test Church", isPrimary: true });
    expect(await run((tx) => listCampuses(tx))).toHaveLength(1);
  });

  it("is put on a person nobody chose a campus for", async () => {
    const person = await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Ada", lastName: "Campus", lifecycleStatus: "member",
      } as never),
    );

    const rows = await run((tx) =>
      tx.execute<{ campus_id: string }>(
        sql`select campus_id from members where id = ${person.id}::uuid`,
      ),
    );
    expect(rows[0]!.campus_id).toBe(campus);
  });

  it("is put on a gathering and on a group just the same", async () => {
    const service = await run((tx) =>
      addSpecialService(tx, as(), {
        name: "Morning", occursOn: "2031-01-05", startsAt: "10:00",
      }),
    );
    /* R9.1. Every group is one of the kinds the church keeps. */
    await run((tx) => seedGroupTypes(tx, as()));
    const [kind] = await run((tx) => listGroupTypes(tx));
    const group = await run((tx) =>
      createGroup(tx, as(), { name: "Tuesday group", typeId: kind!.id }),
    );

    for (const [table, id] of [
      ["service_occurrences", service.id],
      ["groups", group.id],
    ] as const) {
      const rows = await run((tx) =>
        tx.execute<{ campus_id: string }>(
          sql.raw(`select campus_id from ${table} where id = '${id}'`),
        ),
      );
      expect(rows[0]!.campus_id, table).toBe(campus);
    }
  });

  it("renames, because a church calls it something", async () => {
    await run((tx) => renameCampus(tx, as(), campus, "  Riverside   Fellowship  "));
    expect((await run((tx) => primaryCampus(tx)))!.name).toBe("Riverside Fellowship");

    await expect(
      run((tx) => renameCampus(tx, as(), campus, "   ")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("the places inside it", () => {
  let hall: string;

  it("names a place, against the campus, without being told which", async () => {
    hall = (await run((tx) => addLocation(tx, as(), "  The   Hall  "))).id;

    const places = await run((tx) => listLocations(tx));
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ name: "The Hall", campusId: campus });
  });

  it("refuses a second place with the same name", async () => {
    await expect(
      run((tx) => addLocation(tx, as(), "The Hall")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("renames one, and still refuses a name another has", async () => {
    await run((tx) => addLocation(tx, as(), "The Annexe"));
    await run((tx) => renameLocation(tx, as(), hall, "Main Hall"));
    expect((await run((tx) => listLocations(tx))).map((p) => p.name))
      .toEqual(["Main Hall", "The Annexe"]);

    await expect(
      run((tx) => renameLocation(tx, as(), hall, "The Annexe")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("deletes one", async () => {
    await run((tx) => removeLocation(tx, as(), hall));
    expect((await run((tx) => listLocations(tx))).map((p) => p.name)).toEqual(["The Annexe"]);

    await expect(
      run((tx) => removeLocation(tx, as(), hall)),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is refused to anybody who cannot administer the church", async () => {
    for (const role of ["staff", "member"] as TenantRole[]) {
      await expect(
        run((tx) => addLocation(tx, as(role), "Nope"), role),
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });
});
