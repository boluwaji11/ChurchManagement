/**
 * HRT-120. One person's record in the order it happened (R2.15).
 *
 * Two things matter here. The order, because a timeline that is nearly in order
 * is worse than six separate cards. And the gates: a confidential note and a
 * background check are absent for somebody who may not read them, rather than
 * present and blanked out, because a blanked-out row still says one is there.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { personTimeline } from "../src/repo/timeline";
import { createPerson, setPersonArchived } from "../src/repo/people";
import { createNote } from "../src/repo/notes";
import { addMilestone } from "../src/repo/milestones";
import { createGroup, addToGroup, removeFromGroup, seedGroupTypes } from "../src/repo/groups";
import { addSpecialService } from "../src/repo/services";
import { setPresentMany } from "../src/repo/attendance";
import { enterPipeline, listPipelines, seedPipelines } from "../src/repo/followups";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let person: string;
const SLUG = "timelinetest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const timeline = (role: TenantRole = "owner") =>
  run((tx) => personTimeline(tx, { tenantId: tenant, role }, person), role);

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Timeline Test Church");
  await run((tx) => seedGroupTypes(tx, as()));
  await run((tx) => seedPipelines(tx, as()));

  person = (await run((tx) =>
    createPerson(tx, as(), { firstName: "Esther", lastName: "Timelinetest" } as never),
  )).id;

  // A service they were at.
  const service = await run((tx) =>
    addSpecialService(tx, as(), { name: "Harvest", occursOn: "2026-03-01", startsAt: "10:00" }),
  );
  await run((tx) => setPresentMany(tx, as(), service.id, [person], true));

  // A group they joined and later left.
  const group = await run((tx) => createGroup(tx, as(), { name: "Thursday group" }));
  await run((tx) =>
    addToGroup(tx, as(), { groupId: group.id, personId: person, joinedOn: "2026-02-01" }),
  );
  await run((tx) => removeFromGroup(tx, as(), { groupId: group.id, personId: person }));

  // A milestone, a general note and a confidential one.
  await run((tx) =>
    addMilestone(tx, as(), { personId: person, kind: "baptism", occurredOn: "2026-04-12" }),
  );
  await run((tx) =>
    createNote(tx, {
      tenantId: tenant, personId: person,
      body: "Asked about serving.", classification: "general",
    }),
  );
  await run((tx) =>
    createNote(tx, {
      tenantId: tenant, personId: person,
      body: "Pastoral matter.", classification: "confidential",
    }),
  );

  const [pipeline] = await run((tx) => listPipelines(tx));
  await run((tx) =>
    enterPipeline(tx, as(), { pipelineId: pipeline!.id, personId: person, on: "2026-01-15" }),
  );
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("what is on it", () => {
  it("carries every kind of thing the church has recorded", async () => {
    const kinds = new Set((await timeline()).map((e) => e.kind));
    expect(kinds).toContain("added");
    expect(kinds).toContain("joinedGroup");
    expect(kinds).toContain("leftGroup");
    expect(kinds).toContain("milestone");
    expect(kinds).toContain("note");
    expect(kinds).toContain("enteredPipeline");
  });

  it("names the thing out of the church's own records", async () => {
    const entries = await timeline();
    expect(entries.find((e) => e.kind === "joinedGroup")?.subject).toBe("Thursday group");
    expect(entries.find((e) => e.kind === "milestone")?.code).toBe("baptism");
  });

  /*
   * R2.15. Attendance and check-ins are kept off it on purpose. A family at two
   * services a weekend would push a hundred identical lines a year in front of
   * the pastor reading this, and bury the four that matter.
   */
  it("leaves attendance and check-ins to the screens that report them properly", async () => {
    const kinds = new Set((await timeline()).map((e) => e.kind));
    expect(kinds).not.toContain("attended");
    expect(kinds).not.toContain("checkedIn");
  });

  it("is newest first", async () => {
    const days = (await timeline()).map((e) => e.on);
    expect([...days].sort().reverse()).toEqual(days);
  });

  it("puts joining and leaving a group on their own days", async () => {
    const entries = await timeline();
    const joined = entries.find((e) => e.kind === "joinedGroup");
    const left = entries.find((e) => e.kind === "leftGroup");
    expect(joined?.on).toBe("2026-02-01");
    expect(left?.on).not.toBe(joined?.on);
  });

  it("carries the colour the thing already has elsewhere", async () => {
    const entry = (await timeline()).find((e) => e.kind === "enteredPipeline");
    expect(entry?.hue).toBeTruthy();
  });

  it("does not reshuffle between two reads", async () => {
    const a = (await timeline()).map((e) => e.id);
    const b = (await timeline()).map((e) => e.id);
    expect(a).toEqual(b);
  });
});

describe("what a viewer may see", () => {
  it("gives a confidential note to the roles that may read one", async () => {
    const bodies = (await timeline("owner")).filter((e) => e.kind === "note").map((e) => e.detail);
    expect(bodies).toContain("Pastoral matter.");
  });

  it("leaves it out altogether for everybody else", async () => {
    // Absent, not redacted. A redacted row still tells the office that a
    // confidential note about this person exists.
    const entries = await timeline("staff");
    const notes = entries.filter((e) => e.kind === "note");
    expect(notes.map((e) => e.detail)).toContain("Asked about serving.");
    expect(notes.map((e) => e.detail)).not.toContain("Pastoral matter.");
    expect(notes.map((e) => e.code)).not.toContain("confidential");
  });

  it("keeps background checks to the roles that hold them", async () => {
    const staff = await timeline("staff");
    expect(staff.some((e) => e.kind === "check")).toBe(false);
  });
});

describe("somebody who has left", () => {
  it("has the day they were archived on it, and keeps everything before it", async () => {
    const gone = (await run((tx) =>
      createPerson(tx, as(), { firstName: "Past", lastName: "Timelinetest" } as never),
    )).id;
    await run((tx) =>
      addMilestone(tx, as(), { personId: gone, kind: "membership_class", occurredOn: "2026-01-02" }),
    );
    await run((tx) => setPersonArchived(tx, as(), gone, true));

    const entries = await run((tx) => personTimeline(tx, { tenantId: tenant, role: "owner" }, gone));
    expect(entries.some((e) => e.kind === "archived")).toBe(true);
    expect(entries.some((e) => e.kind === "milestone")).toBe(true);
  });

  it("is empty for somebody who does not exist", async () => {
    const entries = await run((tx) =>
      personTimeline(tx, { tenantId: tenant, role: "owner" }, "00000000-0000-4000-8000-000000000000"),
    );
    expect(entries).toEqual([]);
  });
});
