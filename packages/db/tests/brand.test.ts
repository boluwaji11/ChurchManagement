/**
 * HRT-43. The church's own colour, where its congregation sees it (R1.1).
 *
 * The hue was stored and editable and used by nothing. What is tested here is
 * that it reaches the places a church hands something out: the record it is
 * read from, and the serving request a volunteer opens from a message, which is
 * the one branded surface with no session behind it.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { getChurch, updateChurch } from "../src/repo/church";
import { servingRequestFor } from "../src/repo/respond";
import { createPerson } from "../src/repo/people";
import { addSpecialService } from "../src/repo/services";
import { seedTeams, listTeams, getTeam, addToTeam } from "../src/repo/serving";
import { assign, assignmentsForTeam } from "../src/repo/schedule";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let token: string;
const SLUG = "brandtest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

/** updateChurch takes the whole profile, so recolouring means reading it first. */
const recolour = (brandHue: string) =>
  run(async (tx) => {
    const profile = (await getChurch(tx, tenant))!;
    await updateChurch(tx, as(), { ...profile, brandHue } as never);
  });

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Brand Test Church");

  await run((tx) => seedTeams(tx, as()));
  const worship = (await run((tx) => listTeams(tx))).find((x) => x.name === "Worship")!.id;
  const keys = (await run((tx) => getTeam(tx, worship)))!
    .positions.find((p) => p.name === "Keys")!.id;

  const ada = (await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Ada", lastName: "Brand", lifecycleStatus: "member",
    } as never),
  )).id;
  await run((tx) => addToTeam(tx, as(), { teamId: worship, personId: ada }));

  const service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2031-02-02", startsAt: "10:00" }),
  )).id;

  await run((tx) =>
    assign(tx, as(), {
      occurrenceId: service, teamId: worship, positionId: keys, personId: ada,
    }),
  );
  token = (await run((tx) => assignmentsForTeam(tx, worship, [service])))[0]!.token;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("the church's own colour", () => {
  it("starts at the default rather than at nothing", async () => {
    expect((await run((tx) => getChurch(tx, tenant)))!.brandHue).toBe("indigo");
  });

  it("is one of the twelve, and changes", async () => {
    await recolour("jade");
    expect((await run((tx) => getChurch(tx, tenant)))!.brandHue).toBe("jade");
  });

  it("reaches the serving request, which has no session behind it", async () => {
    const request = await servingRequestFor(token);
    expect(request).toMatchObject({ churchName: "Brand Test Church", brandHue: "jade" });
  });

  it("follows the church when it changes its mind", async () => {
    await recolour("coral");
    expect((await servingRequestFor(token))!.brandHue).toBe("coral");
  });

  it("refuses a colour that is not one of the twelve", async () => {
    await expect(recolour("puce")).rejects.toThrow();
  });
});
