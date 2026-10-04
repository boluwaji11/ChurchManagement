/**
 * HRT-149. Conditional logic on a form (R4.2).
 *
 * A church asks "are you new here?" and wants the three follow-up questions to
 * appear for the people who say yes and stay out of everybody else's way. One
 * condition per question: an earlier answer, a test, and a value.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  visibleFields, prunedAnswers, checkSubmission, conditionHolds, conditionProblem,
  formProblems,
  getForm, createForm, addFormField, updateFormField, removeFormField, moveFormField,
  setFormStatus,
  type FormFieldDef,
} from "../src/repo/forms";
import { InvalidInputError } from "../src/errors";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "formcond";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const field = (over: Partial<FormFieldDef> = {}): FormFieldDef => ({
  id: "f1",
  kind: "text",
  label: "Your name",
  help: null,
  required: false,
  options: null,
  position: 0,
  showWhen: null,
  ...over,
});

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Conditions Test Church");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("one condition, four tests", () => {
  const asked = field({ id: "new", kind: "select", label: "Are you new?", options: ["Yes", "No"] });

  it("matches a value", () => {
    expect(conditionHolds({ fieldId: "new", op: "is", value: "Yes" }, asked, "Yes")).toBe(true);
    expect(conditionHolds({ fieldId: "new", op: "is", value: "Yes" }, asked, "No")).toBe(false);
    expect(conditionHolds({ fieldId: "new", op: "is_not", value: "Yes" }, asked, "No")).toBe(true);
  });

  it("asks only whether anything was put in", () => {
    expect(conditionHolds({ fieldId: "new", op: "answered", value: null }, asked, "No")).toBe(true);
    expect(conditionHolds({ fieldId: "new", op: "answered", value: null }, asked, "")).toBe(false);
    expect(conditionHolds({ fieldId: "new", op: "blank", value: null }, asked, null)).toBe(true);
  });

  it("reads a choose-several answer as the set it is", () => {
    const several = field({ id: "ways", kind: "multi_select", options: ["Email", "Phone"] });
    const condition = { fieldId: "ways", op: "is" as const, value: "Phone" };
    expect(conditionHolds(condition, several, ["Email", "Phone"])).toBe(true);
    expect(conditionHolds(condition, several, ["Email"])).toBe(false);
  });

  it("reads a yes or no answer", () => {
    const box = field({ id: "ok", kind: "checkbox" });
    expect(conditionHolds({ fieldId: "ok", op: "is", value: "true" }, box, true)).toBe(true);
    expect(conditionHolds({ fieldId: "ok", op: "is", value: "yes" }, box, true)).toBe(true);
    expect(conditionHolds({ fieldId: "ok", op: "is", value: "true" }, box, false)).toBe(false);
  });
});

describe("what the reader is shown", () => {
  const fields = [
    field({ id: "new", kind: "select", label: "Are you new?", options: ["Yes", "No"], position: 0 }),
    field({
      id: "heard", label: "How did you hear about us?", position: 1,
      showWhen: { fieldId: "new", op: "is", value: "Yes" },
    }),
    field({
      id: "who", label: "Who invited you?", position: 2,
      showWhen: { fieldId: "heard", op: "is", value: "A friend" },
    }),
    field({ id: "note", label: "Anything else", position: 3 }),
  ];

  it("hides the branch until the answer comes", () => {
    expect(visibleFields(fields, {}).map((f) => f.id)).toEqual(["new", "note"]);
  });

  it("opens the branch on the answer", () => {
    expect(visibleFields(fields, { new: "Yes" }).map((f) => f.id)).toEqual(["new", "heard", "note"]);
  });

  it("hides a follow-up under a hidden follow-up", () => {
    // "A friend" would open "who", but "heard" is not being asked at all.
    const shown = visibleFields(fields, { new: "No", heard: "A friend" });
    expect(shown.map((f) => f.id)).toEqual(["new", "note"]);
  });

  it("opens a follow-up under a shown follow-up", () => {
    const shown = visibleFields(fields, { new: "Yes", heard: "A friend" });
    expect(shown.map((f) => f.id)).toEqual(["new", "heard", "who", "note"]);
  });

  it("drops the answers the reader never saw", () => {
    const kept = prunedAnswers(fields, { new: "No", heard: "A friend", who: "Dave", note: "hi" });
    expect(kept).toEqual({ new: "No", note: "hi" });
  });

  it("does not require an answer to a question nobody was asked", () => {
    const required = fields.map((f) => (f.id === "heard" ? { ...f, required: true } : f));
    expect(checkSubmission(required, { new: "No" })).toEqual([]);
    expect(checkSubmission(required, { new: "Yes" })).toEqual([
      { fieldId: "heard", message: "form.error.required" },
    ]);
  });
});

describe("a condition that stopped making sense", () => {
  it("wants a question that exists", () => {
    const one = field({ id: "a", showWhen: { fieldId: "gone", op: "answered", value: null } });
    expect(conditionProblem([one], one)).toBe("form.error.conditionField");
  });

  it("wants a question that comes first", () => {
    const first = field({ id: "a", position: 0, showWhen: { fieldId: "b", op: "answered", value: null } });
    const second = field({ id: "b", position: 1 });
    expect(conditionProblem([first, second], first)).toBe("form.error.conditionOrder");
  });

  it("refuses a heading as the question it waits on", () => {
    const head = field({ id: "h", kind: "section", label: "About you", position: 0 });
    const one = field({ id: "a", position: 1, showWhen: { fieldId: "h", op: "answered", value: null } });
    expect(conditionProblem([head, one], one)).toBe("form.error.conditionField");
  });

  it("wants a value that is one of the choices", () => {
    const pick = field({ id: "p", kind: "select", options: ["Yes", "No"], position: 0 });
    const one = field({ id: "a", position: 1, showWhen: { fieldId: "p", op: "is", value: "Maybe" } });
    expect(conditionProblem([pick, one], one)).toBe("form.error.conditionValue");
    const good = { ...one, showWhen: { fieldId: "p", op: "is" as const, value: "Yes" } };
    expect(conditionProblem([pick, good], good)).toBeNull();
  });

  it("counts as a reason the form cannot open", () => {
    const first = field({ id: "a", position: 0, showWhen: { fieldId: "b", op: "answered", value: null } });
    const second = field({ id: "b", position: 1 });
    expect(formProblems([first, second])).toContain("form.problem.condition");
  });
});

describe("building one", () => {
  let form: string;
  let asked: string;

  beforeAll(async () => {
    form = (await run((tx) => createForm(tx, as(), { name: "Connection card" }))).id;
    asked = (await run((tx) =>
      addFormField(tx, as(), form, {
        kind: "select", label: "Are you new?", options: ["Yes", "No"],
      }))).id;
  });

  it("saves and reads back a condition", async () => {
    const added = await run((tx) =>
      addFormField(tx, as(), form, {
        kind: "text",
        label: "How did you hear about us?",
        showWhen: { fieldId: asked, op: "is", value: "Yes" },
      }));

    const got = await run((tx) => getForm(tx, form));
    const one = got!.fields.find((f) => f.id === added.id)!;
    expect(one.showWhen).toEqual({ fieldId: asked, op: "is", value: "Yes" });
    expect(got!.problems).toEqual([]);

    await run((tx) => removeFormField(tx, as(), added.id));
  });

  it("refuses a value that is not one of the choices", async () => {
    await expect(
      run((tx) =>
        addFormField(tx, as(), form, {
          kind: "text", label: "Which?",
          showWhen: { fieldId: asked, op: "is", value: "Maybe" },
        })),
    ).rejects.toThrow(InvalidInputError);
  });

  it("refuses a blank value where the test needs one", async () => {
    await expect(
      run((tx) =>
        addFormField(tx, as(), form, {
          kind: "text", label: "Which?",
          showWhen: { fieldId: asked, op: "is", value: "  " },
        })),
    ).rejects.toThrow(InvalidInputError);
  });

  it("refuses a question that is not on this form", async () => {
    const other = (await run((tx) => createForm(tx, as(), { name: "Prayer request" }))).id;
    const stranger = (await run((tx) =>
      addFormField(tx, as(), other, { kind: "text", label: "Your request" }))).id;

    await expect(
      run((tx) =>
        addFormField(tx, as(), form, {
          kind: "text", label: "Which?",
          showWhen: { fieldId: stranger, op: "answered", value: null },
        })),
    ).rejects.toThrow(InvalidInputError);
  });

  it("takes the condition off a question again", async () => {
    const added = (await run((tx) =>
      addFormField(tx, as(), form, {
        kind: "text", label: "Who invited you?",
        showWhen: { fieldId: asked, op: "answered", value: null },
      }))).id;

    await run((tx) =>
      updateFormField(tx, as(), added, { kind: "text", label: "Who invited you?", showWhen: null }));

    const got = await run((tx) => getForm(tx, form));
    expect(got!.fields.find((f) => f.id === added)!.showWhen).toBeNull();
    await run((tx) => removeFormField(tx, as(), added));
  });

  it("clears the condition when the question it waited on goes", async () => {
    const trigger = (await run((tx) =>
      addFormField(tx, as(), form, { kind: "checkbox", label: "Baptised?" }))).id;
    const follow = (await run((tx) =>
      addFormField(tx, as(), form, {
        kind: "date", label: "When?",
        showWhen: { fieldId: trigger, op: "is", value: "true" },
      }))).id;

    await run((tx) => removeFormField(tx, as(), trigger));

    const got = await run((tx) => getForm(tx, form));
    expect(got!.fields.find((f) => f.id === follow)!.showWhen).toBeNull();
    expect(got!.problems).toEqual([]);
    await run((tx) => removeFormField(tx, as(), follow));
  });

  it("says so when a move puts a question above the one it waits on", async () => {
    const follow = (await run((tx) =>
      addFormField(tx, as(), form, {
        kind: "text", label: "Who invited you?",
        showWhen: { fieldId: asked, op: "is", value: "Yes" },
      }))).id;

    await run((tx) => moveFormField(tx, as(), { formId: form, id: follow, direction: "up" }));

    const got = await run((tx) => getForm(tx, form));
    expect(got!.problems).toContain("form.problem.condition");
    await expect(run((tx) => setFormStatus(tx, as(), form, "open"))).rejects.toThrow(InvalidInputError);

    // Back where it was, and the form can open again.
    await run((tx) => moveFormField(tx, as(), { formId: form, id: follow, direction: "down" }));
    expect((await run((tx) => getForm(tx, form)))!.problems).toEqual([]);
    await run((tx) => removeFormField(tx, as(), follow));
  });
});
