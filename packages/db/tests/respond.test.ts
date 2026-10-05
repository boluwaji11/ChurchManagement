/**
 * HRT-124. Answering a serving request with no sign-in (R10.6).
 *
 * The token is the whole credential, so what matters is that it names one
 * assignment and nothing else, that a wrong one gives nothing away, and that
 * somebody who said yes on Monday can say no on Thursday.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { servingRequestFor, answerServingRequest } from "../src/repo/respond";
import { assign, assignmentsForTeam } from "../src/repo/schedule";
import { seedTeams, listTeams, getTeam, addToTeam } from "../src/repo/serving";
import { createPerson } from "../src/repo/members";
import { addSpecialService } from "../src/repo/services";
import { InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let token: string;
let pastToken: string;
const SLUG = "respondtest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>) => withTenant({ tenantId: tenant, role: "owner" }, work);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Respond Test Church");
  await run((tx) => seedTeams(tx, as()));

  const worship = (await run((tx) => listTeams(tx))).find((t) => t.name === "Worship")!.id;
  const keys = (await run((tx) => getTeam(tx, worship)))!.positions
    .find((p) => p.name === "Keys")!.id;

  const person = (await run((tx) =>
    createPerson(tx, as(), { firstName: "Ada", lastName: "Respondtest" } as never),
  )).id;
  await run((tx) => addToTeam(tx, as(), { teamId: worship, memberId: person }));

  const coming = await run((tx) =>
    addSpecialService(tx, as(), { name: "Morning", occursOn: "2030-05-05", startsAt: "10:00" }),
  );
  const gone = await run((tx) =>
    addSpecialService(tx, as(), { name: "Last year", occursOn: "2020-05-05", startsAt: "10:00" }),
  );

  await run((tx) =>
    assign(tx, as(), {
      occurrenceId: coming.id, teamId: worship, positionId: keys, memberId: person,
    }),
  );
  await run((tx) =>
    assign(tx, as(), {
      occurrenceId: gone.id, teamId: worship, positionId: keys, memberId: person,
    }),
  );

  const rows = await run((tx) => assignmentsForTeam(tx, worship, [coming.id, gone.id]));
  token = rows.find((r) => r.occurrenceId === coming.id)!.token;
  pastToken = rows.find((r) => r.occurrenceId === gone.id)!.token;
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("the link", () => {
  it("carries the one thing the person was asked", async () => {
    const request = await servingRequestFor(token);
    expect(request?.churchName).toBe("Respond Test Church");
    expect(request?.personName).toContain("Ada");
    expect(request?.teamName).toBe("Worship");
    expect(request?.positionName).toBe("Keys");
    expect(request?.occursOn).toBe("2030-05-05");
    expect(request?.status).toBe("pending");
  });

  it("gives nothing for a token that names nothing", async () => {
    expect(await servingRequestFor("f".repeat(32))).toBeNull();
  });

  it("gives nothing for something that is not a token at all", async () => {
    for (const bad of ["", "abc", "' or 1=1 --", "A".repeat(32)]) {
      expect(await servingRequestFor(bad)).toBeNull();
    }
  });
});

describe("the answer", () => {
  it("records yes", async () => {
    const after = await answerServingRequest(token, { accept: true });
    expect(after.status).toBe("accepted");
    expect(after.declineReason).toBeNull();
  });

  it("records no, with a reason, and lets somebody change their mind", async () => {
    const after = await answerServingRequest(token, { accept: false, reason: "  Away  " });
    expect(after.status).toBe("declined");
    expect(after.declineReason).toBe("Away");
  });

  it("drops the reason when the answer turns back to yes", async () => {
    const after = await answerServingRequest(token, { accept: true });
    expect(after.status).toBe("accepted");
    expect(after.declineReason).toBeNull();
  });

  it("takes no answer for a service that has been and gone", async () => {
    await expect(answerServingRequest(pastToken, { accept: true }))
      .rejects.toThrow(InvalidInputError);
  });

  it("takes no answer on a token that names nothing", async () => {
    await expect(answerServingRequest("0".repeat(32), { accept: true }))
      .rejects.toThrow(InvalidInputError);
  });
});

describe("what the schedule shows afterwards", () => {
  it("carries the answer back to whoever built it", async () => {
    expect((await servingRequestFor(token))?.status).toBe("accepted");
  });
});
