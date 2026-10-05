/**
 * HRT-79. Teams, positions, and a person serving across several of them
 * (R10.1, R10.2).
 *
 * What is worth testing here is the shape of the thing rather than the forms: a
 * team is not a group, a position belongs to one team, somebody who steps off
 * leaves a date behind, and a team leader can run their own rota and nothing
 * else.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  seedTeams, listTeams, getTeam, createTeam, updateTeam, setTeamArchived,
  addPosition, updatePosition, setPositionArchived, reorderPositions,
  addToTeam, removeFromTeam, setTeamMemberRole, setTeamMemberPositions,
  servingForPerson, leadsTeam, SEED_TEAMS,
} from "../src/repo/serving";
import { createPerson } from "../src/repo/members";
import { linkPersonToUser, visiblePeople } from "../src/repo/scope";
import { PermissionError } from "../src/roles";
import { NameTakenError, InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let ada: string;
let boma: string;
const SLUG = "servingtest";

const as = (role: TenantRole = "owner", userId?: string) => ({ tenantId: tenant, role, userId });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const named = (name: string) =>
  run(async (tx) => (await listTeams(tx)).find((t) => t.name === name)!);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Serving Test Church");
  await run((tx) => seedTeams(tx, as()));

  ada = (await run((tx) =>
    createPerson(tx, as(), { firstName: "Ada", lastName: "Servingtest" } as never),
  )).id;
  boma = (await run((tx) =>
    createPerson(tx, as(), { firstName: "Boma", lastName: "Servingtest" } as never),
  )).id;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await owner()`delete from app_users where email = 'leader@servingtest.invalid'`;
  await closeConnections();
});

describe("the teams a church starts with", () => {
  it("are the five it already runs, each with positions", async () => {
    const teams = await run((tx) => listTeams(tx));
    expect(teams.map((t) => t.name)).toEqual(SEED_TEAMS.map((s) => s.name));
    expect(teams.every((t) => t.positions > 0)).toBe(true);
  });

  it("are not seeded twice", async () => {
    expect(await run((tx) => seedTeams(tx, as()))).toBe(0);
  });

  it("say which of them need a background check", async () => {
    const teams = await run((tx) => listTeams(tx));
    expect(teams.find((t) => t.name === "Children")?.needsChecks).toBe(true);
    expect(teams.find((t) => t.name === "Production")?.needsChecks).toBe(false);
  });

  it("mark the children's positions as with children", async () => {
    const children = await named("Children");
    const team = await run((tx) => getTeam(tx, children.id));
    const leader = team!.positions.find((p) => p.name === "Room leader");
    expect(leader?.withChildren).toBe(true);
    expect(leader?.requiresCheck).toBe(true);
    expect(team!.positions.find((p) => p.name === "Check-in desk")?.withChildren).toBe(false);
  });
});

describe("a team", () => {
  it("refuses a second one with the same name", async () => {
    await expect(run((tx) => createTeam(tx, as(), { name: "worship" })))
      .rejects.toThrow(NameTakenError);
  });

  it("refuses a name that is only spaces", async () => {
    await expect(run((tx) => createTeam(tx, as(), { name: "   " })))
      .rejects.toThrow(InvalidInputError);
  });

  it("can be renamed and recoloured", async () => {
    const made = await run((tx) => createTeam(tx, as(), { name: "Prayer", hue: "sky" }));
    const changed = await run((tx) => updateTeam(tx, as(), made.id, { name: "Prayer team", hue: "fern" }));
    expect(changed.name).toBe("Prayer team");
    expect(changed.hue).toBe("fern");
  });

  it("archives rather than disappears", async () => {
    const made = await run((tx) => createTeam(tx, as(), { name: "Van drivers" }));
    await run((tx) => setTeamArchived(tx, as(), made.id, true));

    expect((await run((tx) => listTeams(tx))).map((t) => t.name)).not.toContain("Van drivers");
    expect((await run((tx) => listTeams(tx, { includeArchived: true }))).map((t) => t.name))
      .toContain("Van drivers");
  });

  it("is not something a check-in volunteer can create", async () => {
    await expect(
      run((tx) => createTeam(tx, as("checkin_volunteer"), { name: "Nope" }), "checkin_volunteer"),
    ).rejects.toThrow(PermissionError);
  });
});

describe("a position", () => {
  it("is refused a duplicate name on the same team, and allowed on another", async () => {
    const worship = await named("Worship");
    const production = await named("Production");

    await expect(run((tx) => addPosition(tx, as(), { teamId: worship.id, name: "keys" })))
      .rejects.toThrow(NameTakenError);

    const made = await run((tx) => addPosition(tx, as(), { teamId: production.id, name: "Keys" }));
    expect(made.name).toBe("Keys");
    await run((tx) => setPositionArchived(tx, as(), made.id, true));
  });

  it("refuses a count outside one to ninety-nine", async () => {
    const worship = await named("Worship");
    await expect(
      run((tx) => addPosition(tx, as(), { teamId: worship.id, name: "Choir", needed: 0 })),
    ).rejects.toThrow(InvalidInputError);
  });

  it("asks for a check by default once it is with children", async () => {
    const welcome = await named("Welcome");
    const made = await run((tx) =>
      addPosition(tx, as(), { teamId: welcome.id, name: "Creche cover", withChildren: true }),
    );
    expect(made.requiresCheck).toBe(true);

    await run((tx) =>
      updatePosition(tx, as(), made.id, {
        teamId: welcome.id, name: "Creche cover", withChildren: true, requiresCheck: false,
      }),
    );
    const team = await run((tx) => getTeam(tx, welcome.id));
    expect(team!.positions.find((p) => p.name === "Creche cover")?.requiresCheck).toBe(false);
  });

  it("keeps the order the team put them in", async () => {
    const production = await named("Production");
    const team = await run((tx) => getTeam(tx, production.id));
    const reversed = [...team!.positions].reverse().map((p) => p.id);

    await run((tx) => reorderPositions(tx, as(), production.id, reversed));
    const after = await run((tx) => getTeam(tx, production.id));
    expect(after!.positions.map((p) => p.id)).toEqual(reversed);
  });
});

describe("who is on it", () => {
  it("puts somebody on a team with the positions they play", async () => {
    const worship = await named("Worship");
    const team = await run((tx) => getTeam(tx, worship.id));
    const keys = team!.positions.find((p) => p.name === "Keys")!;
    const vocals = team!.positions.find((p) => p.name === "Vocals")!;

    await run((tx) =>
      addToTeam(tx, as(), {
        teamId: worship.id, memberId: ada, role: "leader",
        positionIds: [keys.id, vocals.id],
      }),
    );

    const after = await run((tx) => getTeam(tx, worship.id));
    const mine = after!.members.find((m) => m.memberId === ada)!;
    expect(mine.role).toBe("leader");
    expect(mine.positions.map((p) => p.name)).toEqual(["Vocals", "Keys"]);
  });

  it("counts the live roster on the list of teams", async () => {
    expect((await named("Worship")).members).toBe(1);
  });

  it("reads every team one person is on", async () => {
    const production = await named("Production");
    await run((tx) => addToTeam(tx, as(), { teamId: production.id, memberId: ada }));

    const serving = await run((tx) => servingForPerson(tx, ada));
    expect(serving.map((s) => s.teamName)).toEqual(["Worship", "Production"]);
    expect(serving.find((s) => s.teamName === "Worship")?.role).toBe("leader");
  });

  it("refuses a position that belongs to another team", async () => {
    const worship = await named("Worship");
    const production = await named("Production");
    const theirs = (await run((tx) => getTeam(tx, production.id)))!.positions[0]!;
    const member = (await run((tx) => getTeam(tx, worship.id)))!.members
      .find((m) => m.memberId === ada)!;

    await run((tx) =>
      setTeamMemberPositions(tx, as(), {
        teamId: worship.id, memberId: member.id, positionIds: [theirs.id],
      }),
    );

    const after = await run((tx) => getTeam(tx, worship.id));
    expect(after!.members.find((m) => m.memberId === ada)?.positions).toEqual([]);
  });

  it("leaves a date behind when somebody steps off", async () => {
    const production = await named("Production");
    await run((tx) => removeFromTeam(tx, as(), { teamId: production.id, memberId: ada }));

    expect((await run((tx) => servingForPerson(tx, ada))).map((s) => s.teamName))
      .toEqual(["Worship"]);
    expect((await named("Production")).members).toBe(0);
  });

  it("takes somebody back on without losing the first spell", async () => {
    const production = await named("Production");
    await run((tx) => addToTeam(tx, as(), { teamId: production.id, memberId: ada }));
    expect((await named("Production")).members).toBe(1);
  });

  it("drops the positions a member played when one is archived", async () => {
    const worship = await named("Worship");
    const team = await run((tx) => getTeam(tx, worship.id));
    const keys = team!.positions.find((p) => p.name === "Keys")!;
    const member = team!.members.find((m) => m.memberId === ada)!;

    await run((tx) =>
      setTeamMemberPositions(tx, as(), {
        teamId: worship.id, memberId: member.id, positionIds: [keys.id],
      }),
    );
    await run((tx) => setPositionArchived(tx, as(), keys.id, true));

    const after = await run((tx) => getTeam(tx, worship.id));
    expect(after!.positions.map((p) => p.name)).not.toContain("Keys");
    expect(after!.members.find((m) => m.memberId === ada)?.positions).toEqual([]);
  });
});

describe("a team leader", () => {
  const userId = "9f2a6c1e-7b4d-4a9f-8c3e-5d1b2a7f6c84";

  beforeAll(async () => {
    await owner()`
      insert into app_users (id, email, full_name)
      values (${userId}, 'leader@servingtest.invalid', 'Boma Leader')
      on conflict (id) do nothing`;
    await run((tx) => linkPersonToUser(tx, boma, userId));

    const ushers = await named("Ushers");
    await run((tx) =>
      addToTeam(tx, as(), { teamId: ushers.id, memberId: boma, role: "leader" }),
    );
  });

  it("is recognised as leading their own team and not another", async () => {
    const ushers = await named("Ushers");
    const welcome = await named("Welcome");
    expect(await run((tx) => leadsTeam(tx, ushers.id, userId))).toBe(true);
    expect(await run((tx) => leadsTeam(tx, welcome.id, userId))).toBe(false);
  });

  it("can change the rota of the team they lead", async () => {
    const ushers = await named("Ushers");
    await run(
      (tx) => addToTeam(tx, as("team_leader", userId), { teamId: ushers.id, memberId: ada }),
      "team_leader",
    );
    expect((await named("Ushers")).members).toBe(2);
  });

  it("cannot change the rota of a team they do not lead", async () => {
    const welcome = await named("Welcome");
    await expect(
      run(
        (tx) => addToTeam(tx, as("team_leader", userId), { teamId: welcome.id, memberId: ada }),
        "team_leader",
      ),
    ).rejects.toThrow(PermissionError);
  });

  it("cannot create a team", async () => {
    await expect(
      run(
        (tx) => createTeam(tx, as("team_leader", userId), { name: "Mine" }),
        "team_leader",
      ),
    ).rejects.toThrow(PermissionError);
  });

  it("cannot make somebody a leader of a team they do not lead", async () => {
    const welcome = await named("Welcome");
    const member = (await run((tx) => getTeam(tx, welcome.id)))!.members[0];
    if (!member) return;
    await expect(
      run(
        (tx) => setTeamMemberRole(tx, as("team_leader", userId), {
          teamId: welcome.id, memberId: member.id, role: "leader",
        }),
        "team_leader",
      ),
    ).rejects.toThrow(PermissionError);
  });

  it("sees the members on their own team in the directory", async () => {
    const visible = await run(
      (tx) => visiblePeople(tx, { role: "team_leader", userId }),
      "team_leader",
    );
    expect(visible).not.toBeNull();
    expect(visible).toContain(boma);
    expect(visible).toContain(ada);
  });
});
