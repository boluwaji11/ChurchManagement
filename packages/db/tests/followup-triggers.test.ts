/**
 * HRT-94. Entering a pipeline without being asked (R5.3).
 *
 * The acceptance criterion is that somebody recorded as attending for the first
 * time is in the First visit pipeline with a due date two days out. The harder
 * half is the other direction: a sweep that runs every day must not raise the
 * same person again tomorrow, and must raise them again if they drift a second
 * time. Both are asserted here.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  seedPipelines, sweepFollowUps, entriesFor, listPipelines, exitPipeline, pipelineForMilestone,
} from "../src/repo/followups";
import { addService, listOccurrences } from "../src/repo/services";
import { setPresent } from "../src/repo/attendance";
import { createPerson } from "../src/repo/people";
import { addMilestone } from "../src/repo/milestones";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let dana: string;
let member: string;
const services: Record<string, string> = {};

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

// Four Sundays. Dana visits on the first two, the member stops after the first.
const SUNDAYS = ["2026-03-01", "2026-03-08", "2026-03-15", "2026-03-22"];

beforeAll(async () => {
  tenant = await testTenant("triggertest", "Trigger Test Church");
  await run((tx) => seedPipelines(tx, as()));

  dana = (await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Dana", lastName: "Trigger", lifecycleStatus: "visitor",
    } as never),
  )).id;

  member = (await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Marcus", lastName: "Trigger", lifecycleStatus: "member",
    } as never),
  )).id;

  for (const [i, day] of SUNDAYS.entries()) {
    await run((tx) => addService(tx, as(), { name: `Sunday ${i}`, occursOn: day, startsAt: "09:00" }));
  }
  for (const row of await run((tx) => listOccurrences(tx))) services[row.occursOn] = row.id;
});

afterAll(async () => {
  await dropTenants("triggertest");
  await closeConnections();
});

describe("a first visit (R5.3)", () => {
  it("raises the pipeline, dated from the day they came", async () => {
    await run((tx) => setPresent(tx, as(), services[SUNDAYS[0]!]!, dana, true));
    await run((tx) => setPresent(tx, as(), services[SUNDAYS[0]!]!, member, true));

    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: SUNDAYS[0]! }));
    expect(swept.firstVisit).toBe(1);

    const [entry] = await run((tx) => entriesFor(tx, dana));
    expect(entry!.pipelineKey).toBe("first_visit");
    expect(entry!.reason).toBe("first_visit");
    expect(entry!.startedOn).toBe(SUNDAYS[0]);
    // The criterion: two days out.
    expect(entry!.steps[0]!.dueOn).toBe("2026-03-03");
  });

  it("leaves a member alone, because the record began the day they started using it", async () => {
    expect(await run((tx) => entriesFor(tx, member))).toEqual([]);
  });

  it("does not raise it again tomorrow", async () => {
    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: "2026-03-02" }));
    expect(swept.firstVisit).toBe(0);
    expect((await run((tx) => entriesFor(tx, dana))).length).toBe(1);
  });

  it("does not raise it again once the church has closed it", async () => {
    const [entry] = await run((tx) => entriesFor(tx, dana));
    await run((tx) => exitPipeline(tx, as(), { entryId: entry!.id, reason: "Welcomed." }));

    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: "2026-03-03" }));
    expect(swept.firstVisit).toBe(0);
  });
});

describe("a second visit (R5.3)", () => {
  it("raises the second pipeline when they come back", async () => {
    await run((tx) => setPresent(tx, as(), services[SUNDAYS[1]!]!, dana, true));

    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: SUNDAYS[1]! }));
    expect(swept.secondVisit).toBe(1);

    const entries = await run((tx) => entriesFor(tx, dana));
    const second = entries.find((e) => e.pipelineKey === "second_visit")!;
    expect(second.startedOn).toBe(SUNDAYS[1]);
    expect(second.reason).toBe("second_visit");
  });

  it("raises each one once", async () => {
    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: SUNDAYS[1]! }));
    expect(swept.firstVisit + swept.secondVisit).toBe(0);
  });
});

describe("three missed in a row (R5.3, R7.6)", () => {
  it("is quiet until the church's own threshold is passed", async () => {
    // Marcus came on the first Sunday and has missed two since.
    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: SUNDAYS[2]! }));
    expect(swept.absent).toBe(0);
  });

  it("raises it on the third, dated today", async () => {
    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: SUNDAYS[3]! }));
    expect(swept.absent).toBe(1);

    const entries = await run((tx) => entriesFor(tx, member));
    expect(entries.map((e) => e.pipelineKey)).toEqual(["absent"]);
    expect(entries[0]!.reason).toBe("absent");
  });

  it("raises it once for one spell, however often the sweep runs", async () => {
    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: "2026-03-29" }));
    expect(swept.absent).toBe(0);
  });

  it("uses the church's own number rather than ours", async () => {
    await owner()`update tenants set absence_threshold = 10 where id = ${tenant}`;

    const priya = (await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Priya", lastName: "Trigger", lifecycleStatus: "member",
      } as never),
    )).id;
    await run((tx) => setPresent(tx, as(), services[SUNDAYS[0]!]!, priya, true));

    // Three missed, which is our default and under the church's own number.
    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: SUNDAYS[3]! }));
    expect(swept.absent).toBe(0);
    expect(await run((tx) => entriesFor(tx, priya))).toEqual([]);

    await owner()`update tenants set absence_threshold = 3 where id = ${tenant}`;
  });
});

describe("a milestone (R5.3)", () => {
  it("raises the pipeline that leads to it", async () => {
    await run((tx) =>
      addMilestone(tx, as(), { personId: dana, kind: "baptism", occurredOn: "2026-03-20" } as never),
    );
    const entries = await run((tx) => entriesFor(tx, dana));
    expect(entries.map((e) => e.pipelineKey)).toContain("baptism");
  });

  it("raises nothing for a milestone with no pipeline behind it", async () => {
    const before = (await run((tx) => entriesFor(tx, member))).length;
    await run((tx) =>
      pipelineForMilestone(tx, tenant, { personId: member, kind: "marriage", on: "2026-03-20" }),
    );
    expect((await run((tx) => entriesFor(tx, member))).length).toBe(before);
  });
});

describe("a pipeline the church switched off", () => {
  it("is never entered by a trigger", async () => {
    const first = (await run((tx) => listPipelines(tx))).find((p) => p.key === "first_visit")!;
    await owner()`update pipelines set archived_at = now() where id = ${first.id}`;

    const newcomer = (await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Theo", lastName: "Trigger", lifecycleStatus: "visitor",
      } as never),
    )).id;
    await run((tx) => setPresent(tx, as(), services[SUNDAYS[3]!]!, newcomer, true));

    const swept = await run((tx) => sweepFollowUps(tx, tenant, { today: SUNDAYS[3]! }));
    expect(swept.firstVisit).toBe(0);
    expect(await run((tx) => entriesFor(tx, newcomer))).toEqual([]);
  });
});
