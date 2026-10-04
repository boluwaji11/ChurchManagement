/**
 * HRT-93. Follow-up pipelines (R5.1, R5.2, R5.4 to R5.7).
 *
 * The acceptance criterion is about dates and about nobody being followed up
 * twice, so both are asserted here. The six pipelines are a product decision
 * rather than configuration, so the test names them.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  seedPipelines, listPipelines, enterPipeline, exitPipeline, completeFollowUp, reopenFollowUp,
  addTask, entriesFor, tasksFor, myFollowUps, unassignedFollowUps, assignFollowUp,
  pipelineBoard, peopleIn, isInPipeline, DEFAULT_PIPELINES,
  createPipeline, updatePipeline, saveSteps, setPipelineArchived, assignableUsers,
} from "../src/repo/followups";
import { createPerson } from "../src/repo/people";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let visitor: string;
let other: string;
let firstVisit: string;

const pastor = "99999999-9999-4999-8999-999999999999";
const volunteer = "aaaaaaaa-9999-4999-8999-999999999999";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role, userId: pastor });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role, userId: pastor }, work);

const MONDAY = "2026-10-05";
const TODAY = "2026-10-20";

beforeAll(async () => {
  tenant = await testTenant("followuptest", "Follow-up Test Church");

  for (const id of [pastor, volunteer]) {
    await owner()`
      insert into app_users (id, email) values (${id}, ${`${id}@followuptest.invalid`})
      on conflict (id) do nothing`;
  }

  await run((tx) => seedPipelines(tx, as()));
  firstVisit = (await run((tx) => listPipelines(tx))).find((p) => p.key === "first_visit")!.id;

  const make = async (firstName: string) =>
    (await run((tx) =>
      createPerson(tx, as(), {
        firstName, lastName: "Newcomer", lifecycleStatus: "visitor",
      } as never),
    )).id;

  visitor = await make("Dana");
  other = await make("Eli");
});

afterAll(async () => {
  await dropTenants("followuptest");
  await owner()`delete from app_users where id in (${pastor}, ${volunteer})`;
  await closeConnections();
});

describe("the six (R5.2)", () => {
  it("are created with the church, and there are six", async () => {
    const all = await run((tx) => listPipelines(tx));
    expect(all.map((p) => p.key).sort()).toEqual(
      DEFAULT_PIPELINES.map((p) => p.key).sort(),
    );
    expect(all.length).toBe(6);
  });

  it("each come with their steps, in order", async () => {
    const all = await run((tx) => listPipelines(tx));
    const first = all.find((p) => p.key === "first_visit")!;
    expect(first.steps.map((s) => s.name)).toEqual([
      "Say thank you", "Call them", "Invite them to something",
    ]);
    expect(first.steps.map((s) => s.dueDays)).toEqual([2, 7, 21]);
  });

  it("are seeded once, however often that runs", async () => {
    await run((tx) => seedPipelines(tx, as()));
    expect((await run((tx) => listPipelines(tx))).length).toBe(6);
  });
});

describe("entering one (R5.1, R5.4)", () => {
  it("writes every step out, dated from the day they came", async () => {
    const entry = await run((tx) =>
      enterPipeline(tx, as(), { pipelineKey: "first_visit", personId: visitor, on: MONDAY }),
    );
    expect(entry!.pipelineName).toBe("First visit");
    expect(entry!.steps.map((s) => s.dueOn)).toEqual(["2026-10-07", "2026-10-12", "2026-10-26"]);
    expect(entry!.steps.every((s) => s.doneAt === null)).toBe(true);
  });

  it("leaves somebody already in it where they are", async () => {
    const again = await run((tx) =>
      enterPipeline(tx, as(), { pipelineKey: "first_visit", personId: visitor, on: "2026-10-12" }),
    );
    expect(again).toBeNull();
    expect((await run((tx) => entriesFor(tx, visitor))).length).toBe(1);
  });

  it("refuses a day it cannot store", async () => {
    await expect(
      run((tx) => enterPipeline(tx, as(), {
        pipelineKey: "second_visit", personId: visitor, on: "last Sunday",
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses somebody who is not a person here", async () => {
    await expect(
      run((tx) => enterPipeline(tx, as(), {
        pipelineKey: "second_visit",
        personId: "00000000-0000-4000-8000-000000000000",
        on: MONDAY,
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is owner, admin, staff and pastoral, and nobody else", async () => {
    for (const role of ["group_leader", "checkin_volunteer", "member"] as const) {
      await expect(
        run((tx) => enterPipeline(tx, { tenantId: tenant, role }, {
          pipelineKey: "baptism", personId: other, on: MONDAY,
        }), role),
        role,
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });

  it("knows who is already being followed up", async () => {
    expect(await run((tx) => isInPipeline(tx, visitor, "first_visit"))).toBe(true);
    expect(await run((tx) => isInPipeline(tx, other, "first_visit"))).toBe(false);
  });
});

describe("working them (R5.1, R5.5)", () => {
  it("is everything waiting on me, overdue first", async () => {
    const [entry] = await run((tx) => entriesFor(tx, visitor));
    for (const step of entry!.steps) {
      await run((tx) => assignFollowUp(tx, as(), { id: step.id, assigneeUserId: pastor }));
    }

    const mine = await run((tx) => myFollowUps(tx, pastor));
    expect(mine.map((f) => f.title)).toEqual([
      "Say thank you", "Call them", "Invite them to something",
    ]);
    expect(mine[0]!.personName).toBe("Dana Newcomer");
    expect(mine[0]!.pipelineName).toBe("First visit");
  });

  it("puts a step with no day after the dated ones", async () => {
    const undated = await run((tx) =>
      addTask(tx, as(), { personId: visitor, title: "Whenever", assigneeUserId: pastor }),
    );
    const mine = await run((tx) => myFollowUps(tx, pastor));
    expect(mine[mine.length - 1]!.id).toBe(undated.id);
  });

  it("is nothing for somebody with nothing assigned", async () => {
    expect(await run((tx) => myFollowUps(tx, volunteer))).toEqual([]);
  });

  it("records what happened, and drops it off the queue", async () => {
    const [step] = await run((tx) => myFollowUps(tx, pastor));
    await run((tx) => completeFollowUp(tx, as(), { id: step!.id, outcome: "Texted her." }));

    const mine = await run((tx) => myFollowUps(tx, pastor));
    expect(mine.map((f) => f.title)).not.toContain("Say thank you");

    const [entry] = await run((tx) => entriesFor(tx, visitor));
    const done = entry!.steps.find((s) => s.title === "Say thank you")!;
    expect(done.outcome).toBe("Texted her.");
    expect(done.doneAt).not.toBeNull();
  });

  it("closes the whole thing when the last step is answered", async () => {
    for (const step of await run((tx) => myFollowUps(tx, pastor))) {
      await run((tx) => completeFollowUp(tx, as(), { id: step.id }));
    }
    const [entry] = await run((tx) => entriesFor(tx, visitor));
    expect(entry!.status).toBe("done");
  });

  it("opens it again when somebody ticked the wrong line", async () => {
    const [entry] = await run((tx) => entriesFor(tx, visitor));
    await run((tx) => reopenFollowUp(tx, as(), entry!.steps[2]!.id));

    const [after] = await run((tx) => entriesFor(tx, visitor));
    expect(after!.status).toBe("open");
    expect(await run((tx) => myFollowUps(tx, pastor))).toHaveLength(1);
  });
});

describe("leaving one (R5.4)", () => {
  it("keeps why", async () => {
    const [entry] = await run((tx) => entriesFor(tx, visitor));
    await run((tx) => exitPipeline(tx, as(), { entryId: entry!.id, reason: "Moved away." }));

    const [after] = await run((tx) => entriesFor(tx, visitor));
    expect(after!.status).toBe("left");
    expect(after!.exitReason).toBe("Moved away.");
  });

  it("refuses a reason that is not given", async () => {
    const entry = await run((tx) =>
      enterPipeline(tx, as(), { pipelineKey: "serving", personId: other, on: MONDAY }),
    );
    await expect(
      run((tx) => exitPipeline(tx, as(), { entryId: entry!.id, reason: "  " })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses to close one twice", async () => {
    const [entry] = await run((tx) => entriesFor(tx, other));
    await run((tx) => exitPipeline(tx, as(), { entryId: entry!.id, reason: "Already serving." }));
    await expect(
      run((tx) => exitPipeline(tx, as(), { entryId: entry!.id, reason: "Again." })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("a task on its own (R5.6)", () => {
  it("belongs to a person and to no pipeline", async () => {
    const task = await run((tx) =>
      addTask(tx, as(), {
        personId: other, title: "Drop the book round", assigneeUserId: volunteer,
        dueOn: "2026-10-18",
      }),
    );
    expect(task.entryId).toBeNull();
    expect(task.pipelineName).toBeNull();

    const theirs = await run((tx) => tasksFor(tx, other));
    expect(theirs.map((t) => t.title)).toEqual(["Drop the book round"]);
    expect((await run((tx) => myFollowUps(tx, volunteer))).length).toBe(1);
  });

  it("refuses an empty one", async () => {
    await expect(run((tx) => addTask(tx, as(), { personId: other, title: "   " })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is listed as nobody's until somebody takes it", async () => {
    const task = await run((tx) => addTask(tx, as(), { personId: other, title: "Ring the school" }));
    const waiting = await run((tx) => unassignedFollowUps(tx));
    expect(waiting.map((f) => f.id)).toContain(task.id);
  });
});

describe("the board (R5.7)", () => {
  it("counts who is in each one, and how late it is", async () => {
    await run((tx) => enterPipeline(tx, as(), {
      pipelineKey: "membership", personId: visitor, on: MONDAY,
    }));

    const board = await run((tx) => pipelineBoard(tx, TODAY));
    const membership = board.find((p) => p.key === "membership")!;
    expect(membership.open).toBe(1);
    // Confirm their place was due on the 8th, and today is the 20th.
    expect(membership.overdue).toBe(1);
    expect(membership.longestDays).toBe(15);

    const empty = board.find((p) => p.key === "baptism")!;
    expect(empty.open).toBe(0);
    expect(empty.longestDays).toBeNull();
  });

  it("names who is in one, so the number can be opened", async () => {
    const membership = (await run((tx) => listPipelines(tx))).find((p) => p.key === "membership")!;
    const inside = await run((tx) => peopleIn(tx, membership.id));
    expect(inside.map((e) => e.personId)).toEqual([visitor]);
  });
});

describe("another church's follow-ups", () => {
  it("are never returned", async () => {
    const otherId = await testTenant("followuptest2", "Other Follow-up Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      pipelineBoard(tx, TODAY),
    );
    expect(theirs).toEqual([]);
    expect(firstVisit).toBeTruthy();
    await dropTenants("followuptest2");
  });
});

/**
 * HRT-97. Editing the six (R5.2).
 *
 * The line this draws is the point of the story: a church rewords its own
 * process and cannot invent a seventh pipeline or branch one. The other half is
 * that editing a template must not touch the people already in it.
 */
describe("editing the six (R5.2)", () => {
  it("renames one and rewords its steps", async () => {
    const serving = (await run((tx) => listPipelines(tx))).find((p) => p.key === "serving")!;
    const after = await run((tx) =>
      updatePipeline(tx, as(), serving.id, {
        name: "Getting involved",
        description: "Somebody wants to help on a Sunday.",
        steps: [
          { id: serving.steps[0]!.id, name: "Coffee with them", dueDays: 7 },
          { name: "Introduce them to a team lead", dueDays: 14 },
        ],
      }),
    );

    expect(after.name).toBe("Getting involved");
    expect(after.steps.map((s) => s.name)).toEqual([
      "Coffee with them", "Introduce them to a team lead",
    ]);
    expect(after.steps.map((s) => s.dueDays)).toEqual([7, 14]);
  });

  it("puts a step where its day count puts it", async () => {
    const absent = (await run((tx) => listPipelines(tx))).find((p) => p.key === "absent")!;
    const after = await run((tx) =>
      updatePipeline(tx, as(), absent.id, {
        name: absent.name,
        steps: [
          ...absent.steps.map((step) => ({ id: step.id, name: step.name, dueDays: step.dueDays })),
          { name: "Test", dueDays: 7 },
        ],
      }),
    );

    expect(after.steps.map((step) => step.dueDays)).toEqual([3, 7, 14]);
    expect(after.steps.map((step) => step.name)).toEqual([
      "Check they are well", "Test", "Pastoral call",
    ]);
  });

  it("makes a seventh, with a key of its own and a step to work", async () => {
    const made = await run((tx) =>
      createPipeline(tx, as(), { name: "Welcome home", description: "Somebody came back." }),
    );

    expect(made.key).toBe("welcome_home");
    expect(made.steps).toHaveLength(1);
    expect(made.archived).toBe(false);

    const filled = await run((tx) =>
      createPipeline(tx, as(), {
        name: "Prayer",
        ownerUserId: pastor,
        steps: [{ name: "Pray with them", dueDays: 14 }, { name: "Ring them", dueDays: 2 }],
      }),
    );
    expect(filled.ownerUserId).toBe(pastor);
    expect(filled.steps.map((step) => step.name)).toEqual(["Ring them", "Pray with them"]);

    const again = await run((tx) => createPipeline(tx, as(), { name: "Welcome home" }));
    expect(again.key).toBe("welcome_home_2");

    const all = await run((tx) => listPipelines(tx));
    expect(all.filter((one) => one.name === "Welcome home")).toHaveLength(2);
  });

  it("refuses a seventh from somebody who does not run the church", async () => {
    await expect(
      run((tx) => createPipeline(tx, as("pastoral"), { name: "Mine" }), "pastoral"),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("leaves the people already in it alone", async () => {
    const membership = (await run((tx) => listPipelines(tx))).find((p) => p.key === "membership")!;
    const before = (await run((tx) => entriesFor(tx, visitor)))
      .find((e) => e.pipelineKey === "membership")!;

    await run((tx) =>
      updatePipeline(tx, as(), membership.id, {
        name: "Membership",
        steps: [{ name: "One step now", dueDays: 1 }],
      }),
    );

    const after = (await run((tx) => entriesFor(tx, visitor)))
      .find((e) => e.pipelineKey === "membership")!;
    expect(after.steps.map((s) => s.title)).toEqual(before.steps.map((s) => s.title));
  });

  it("refuses a pipeline with no steps", async () => {
    const baptism = (await run((tx) => listPipelines(tx))).find((p) => p.key === "baptism")!;
    await expect(
      run((tx) => updatePipeline(tx, as(), baptism.id, { name: "Baptism", steps: [] })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses a step with no name, and a count of days that is not one", async () => {
    const baptism = (await run((tx) => listPipelines(tx))).find((p) => p.key === "baptism")!;
    await expect(
      run((tx) => saveSteps(tx, as(), baptism.id, [{ name: "  ", dueDays: 3 }])),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      run((tx) => saveSteps(tx, as(), baptism.id, [{ name: "Talk", dueDays: 400 }])),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is owner and admin, because this is the process rather than the work", async () => {
    const baptism = (await run((tx) => listPipelines(tx))).find((p) => p.key === "baptism")!;
    for (const role of ["staff", "pastoral", "member"] as const) {
      await expect(
        run((tx) => updatePipeline(tx, { tenantId: tenant, role }, baptism.id, {
          name: "Theirs", steps: [{ name: "Talk", dueDays: 3 }],
        }), role),
        role,
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });

  it("switches one off, and nobody new enters it", async () => {
    const serving = (await run((tx) => listPipelines(tx))).find((p) => p.key === "serving")!;
    await run((tx) => setPipelineArchived(tx, as(), serving.id, true));

    expect((await run((tx) => listPipelines(tx))).some((p) => p.key === "serving")).toBe(false);
    await expect(
      run((tx) => enterPipeline(tx, as(), {
        pipelineKey: "serving", personId: other, on: MONDAY,
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);

    await run((tx) => setPipelineArchived(tx, as(), serving.id, false));
  });

  it("names who a follow-up can be given to", async () => {
    const people = await run((tx) => assignableUsers(tx));
    expect(people.every((p) => ["owner", "admin", "staff", "pastoral"].includes(p.role))).toBe(true);
  });
});
