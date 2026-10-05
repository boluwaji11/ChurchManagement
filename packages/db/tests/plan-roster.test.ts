/**
 * HRT-131. Who serves, read from the plan (R11.9).
 *
 * The requirement is that the plan and the schedule are one thing, so what is
 * tested is that a name put down through the plan is an ordinary serving
 * request, answered on the ordinary link, and that an answer of no leaves the
 * position short on the plan.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { assign, unassign, rosterFor, assignmentsForPerson } from "../src/repo/schedule";
import { answerServingRequest } from "../src/repo/respond";
import { seedTeams, listTeams, getTeam, addToTeam, setTeamArchived } from "../src/repo/serving";
import { createPerson } from "../src/repo/members";
import { addSpecialService } from "../src/repo/services";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let worship: string;
let keys: string;
let ada: string;
let boma: string;
const SLUG = "planrostertest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const positionOn = async (name: string) => {
  const roster = await run((tx) => rosterFor(tx, service));
  const team = roster.find((x) => x.name === "Worship")!;
  return team.positions.find((p) => p.name === name)!;
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Plan Roster Test Church");
  await run((tx) => seedTeams(tx, as()));

  worship = (await run((tx) => listTeams(tx))).find((x) => x.name === "Worship")!.id;
  keys = (await run((tx) => getTeam(tx, worship)))!.positions.find((p) => p.name === "Keys")!.id;

  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-11-03", startsAt: "10:00" }),
  )).id;

  ada = (await run((tx) => createPerson(tx, as(), { firstName: "Ada", lastName: "Roster" } as never))).id;
  boma = (await run((tx) => createPerson(tx, as(), { firstName: "Boma", lastName: "Roster" } as never))).id;
  for (const id of [ada, boma]) {
    await run((tx) => addToTeam(tx, as(), { teamId: worship, memberId: id }));
  }
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("who serves, on the plan", () => {
  it("lists the teams with positions to fill, and nobody in them yet", async () => {
    const roster = await run((tx) => rosterFor(tx, service));
    expect(roster.length).toBeGreaterThan(0);

    const position = await positionOn("Keys");
    expect(position.entries).toHaveLength(0);
    expect(position.short).toBe(position.needed);
  });

  it("shows somebody put down, pending, and counts them as filling it", async () => {
    await run((tx) =>
      assign(tx, as(), { occurrenceId: service, teamId: worship, positionId: keys, memberId: ada }),
    );

    const position = await positionOn("Keys");
    expect(position.entries).toHaveLength(1);
    expect(position.entries[0]).toMatchObject({ personName: "Ada Roster", status: "pending" });
    expect(position.short).toBe(position.needed - 1);
  });

  it("is the same request the person answers, on the same link", async () => {
    const position = await positionOn("Keys");
    const token = position.entries[0]!.token;

    const mine = await run((tx) => assignmentsForPerson(tx, ada));
    expect(mine.map((x) => x.token)).toContain(token);

    await answerServingRequest(token, { accept: true });
    expect((await positionOn("Keys")).entries[0]!.status).toBe("accepted");
  });

  it("counts a declined request as nobody, so the position reads short", async () => {
    const before = await positionOn("Keys");
    await answerServingRequest(before.entries[0]!.token, { accept: false, reason: "Away" });

    const after = await positionOn("Keys");
    expect(after.entries[0]!.status).toBe("declined");
    expect(after.short).toBe(after.needed);
  });

  it("goes back to empty when they are taken off", async () => {
    const position = await positionOn("Keys");
    await run((tx) => unassign(tx, as(), position.entries[0]!.assignmentId));
    expect((await positionOn("Keys")).entries).toHaveLength(0);
  });

  it("holds more than one person where the position wants more than one", async () => {
    const vocals = (await run((tx) => getTeam(tx, worship)))!
      .positions.find((p) => p.name === "Vocals")!;

    for (const id of [ada, boma]) {
      await run((tx) =>
        assign(tx, as(), {
          occurrenceId: service, teamId: worship, positionId: vocals.id, memberId: id,
        }),
      );
    }

    const position = await positionOn("Vocals");
    expect(position.entries.map((e) => e.personName).sort()).toEqual(["Ada Roster", "Boma Roster"]);
  });

  it("leaves out a team that has been archived", async () => {
    const ushers = (await run((tx) => listTeams(tx))).find((x) => x.name === "Ushers")!;
    await run((tx) => setTeamArchived(tx, as(), ushers.id, true));

    const roster = await run((tx) => rosterFor(tx, service));
    expect(roster.map((x) => x.name)).not.toContain("Ushers");
  });

  it("reads nothing for a gathering nobody is down for", async () => {
    const other = (await run((tx) =>
      addSpecialService(tx, as(), { name: "Midweek", occursOn: "2030-11-06", startsAt: "19:00" }),
    )).id;

    const roster = await run((tx) => rosterFor(tx, other));
    expect(roster.flatMap((x) => x.positions).flatMap((p) => p.entries)).toHaveLength(0);
  });
});
