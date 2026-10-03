/**
 * HRT-125. A swap: the volunteer asks, the leader decides (R10.7).
 *
 * The decision stays with the leader. A church that found its drummer replaced
 * overnight by an algorithm would stop trusting the schedule, so the system
 * offers names and does nothing else.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  askForSubstitute, withdrawSubstitute, substituteStatusFor,
  openSubstitutes, coverFor, fillSubstitute, cancelSubstitute, answerCounts,
} from "../src/repo/substitutes";
import { assign, assignmentsForTeam } from "../src/repo/schedule";
import { servingRequestFor } from "../src/repo/respond";
import { seedTeams, listTeams, getTeam, addToTeam } from "../src/repo/serving";
import { createPerson } from "../src/repo/people";
import { addSpecialService } from "../src/repo/services";
import { InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let worship: string;
let keys: string;
let service: string;
const ids: Record<string, string> = {};
const SLUG = "substitutetest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>) => withTenant({ tenantId: tenant, role: "owner" }, work);

const tokenFor = async (personId: string) => {
  const rows = await run((tx) => assignmentsForTeam(tx, worship, [service]));
  return rows.find((r) => r.personId === personId)!.token;
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Substitute Test Church");
  await run((tx) => seedTeams(tx, as()));

  worship = (await run((tx) => listTeams(tx))).find((t) => t.name === "Worship")!.id;
  keys = (await run((tx) => getTeam(tx, worship)))!.positions.find((p) => p.name === "Keys")!.id;

  for (const name of ["Ada", "Boma", "Chi"]) {
    ids[name] = (await run((tx) =>
      createPerson(tx, as(), { firstName: name, lastName: "Substitutetest" } as never),
    )).id;
    await run((tx) => addToTeam(tx, as(), { teamId: worship, personId: ids[name]! }));
  }

  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-06-02", startsAt: "10:00" }),
  )).id;

  await run((tx) =>
    assign(tx, as(), {
      occurrenceId: service, teamId: worship, positionId: keys, personId: ids.Ada!,
    }),
  );
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("asking", () => {
  it("says no to the request at the same time, so the slot reads empty", async () => {
    const token = await tokenFor(ids.Ada!);
    await askForSubstitute(token, "  Working that day  ");

    const request = await servingRequestFor(token);
    expect(request?.status).toBe("declined");
    expect(request?.declineReason).toBe("Working that day");
    expect(await substituteStatusFor(token)).toBe("open");
  });

  it("reaches the leader, naming the slot and who asked", async () => {
    const [open] = await run((tx) => openSubstitutes(tx, { teamId: worship }));
    expect(open?.personName).toContain("Ada");
    expect(open?.positionName).toBe("Keys");
    expect(open?.reason).toBe("Working that day");
  });

  it("is asking once, however many times it is pressed", async () => {
    const token = await tokenFor(ids.Ada!);
    await askForSubstitute(token);
    expect(await run((tx) => openSubstitutes(tx, { teamId: worship }))).toHaveLength(1);
  });

  it("gives nothing for a token that names nothing", async () => {
    await expect(askForSubstitute("a".repeat(32))).rejects.toThrow(InvalidInputError);
  });
});

describe("who could cover", () => {
  it("offers the rest of the team, and not the person who asked", async () => {
    const [open] = await run((tx) => openSubstitutes(tx, { teamId: worship }));
    const names = (await run((tx) => coverFor(tx, open!.id))).map((c) => c.name);
    expect(names.some((n) => n.startsWith("Ada"))).toBe(false);
    expect(names.some((n) => n.startsWith("Boma"))).toBe(true);
    expect(names.some((n) => n.startsWith("Chi"))).toBe(true);
  });
});

describe("the leader deciding", () => {
  it("puts somebody in, and the request closes", async () => {
    const [open] = await run((tx) => openSubstitutes(tx, { teamId: worship }));
    await run((tx) => fillSubstitute(tx, as(), { requestId: open!.id, personId: ids.Boma! }));

    expect(await run((tx) => openSubstitutes(tx, { teamId: worship }))).toHaveLength(0);

    const rows = await run((tx) => assignmentsForTeam(tx, worship, [service]));
    expect(rows.find((r) => r.personId === ids.Boma)).toBeTruthy();
  });

  it("keeps the declined row, because who asked and who covered is the history", async () => {
    const rows = await run((tx) => assignmentsForTeam(tx, worship, [service]));
    const hers = rows.find((r) => r.personId === ids.Ada);
    expect(hers?.status).toBe("declined");
  });

  it("will not answer a request twice", async () => {
    const all = await run((tx) =>
      openSubstitutes(tx, { teamId: worship, occurrenceIds: [service] }),
    );
    expect(all).toHaveLength(0);
  });

  it("can close one without a swap", async () => {
    await askForSubstitute(await tokenFor(ids.Boma!), "Away");
    const [open] = await run((tx) => openSubstitutes(tx, { teamId: worship }));
    await run((tx) => cancelSubstitute(tx, as(), open!.id));
    expect(await run((tx) => openSubstitutes(tx, { teamId: worship }))).toHaveLength(0);
  });
});

describe("withdrawing", () => {
  it("takes the request back", async () => {
    await run((tx) =>
      assign(tx, as(), {
        occurrenceId: service, teamId: worship, positionId: keys, personId: ids.Chi!,
      }),
    );

    const token = await tokenFor(ids.Chi!);
    await askForSubstitute(token);
    expect(await substituteStatusFor(token)).toBe("open");

    await withdrawSubstitute(token);
    expect(await substituteStatusFor(token)).toBe("withdrawn");
    expect(await run((tx) => openSubstitutes(tx, { teamId: worship }))).toHaveLength(0);
  });
});

describe("how the schedule stands", () => {
  it("counts what each team has been answered", async () => {
    const counts = await run((tx) =>
      answerCounts(tx, { teamIds: [worship], from: "2030-01-01" }),
    );
    expect(counts[worship]!.declined).toBeGreaterThan(0);
    expect(counts[worship]!.substitutes).toBe(0);
  });
});
