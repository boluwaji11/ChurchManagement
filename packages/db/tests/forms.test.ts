/**
 * HRT-148. The form builder (R4.1, R4.9).
 *
 * A church writes the questions once and the answers land on members's records.
 * This is the writing: every kind of question, the headings between them, what
 * is required, and what stops a half-built form being put in front of anybody.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  FORM_FIELD_KINDS, checkAnswer, checkSubmission, formProblems, formSlug, answered,
  listForms, getForm, createForm, updateForm, setFormStatus, setFormArchived,
  addFormField, updateFormField, removeFormField, moveFormField,
  type FormFieldDef,
} from "../src/repo/forms";
import { InvalidInputError } from "../src/errors";
import { PermissionError } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let form: string;
const SLUG = "formstest";

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
  ...over,
});

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Forms Test Church");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("checking an answer", () => {
  it("knows what counts as having answered", () => {
    expect(answered("")).toBe(false);
    expect(answered("   ")).toBe(false);
    expect(answered([])).toBe(false);
    expect(answered(false)).toBe(false);
    expect(answered(0)).toBe(true);
    expect(answered("no")).toBe(true);
  });

  it("asks for a required answer and lets an optional one go", () => {
    expect(checkAnswer(field({ required: true }), "")).toBe("form.error.required");
    expect(checkAnswer(field({ required: false }), "")).toBeNull();
  });

  it("never requires anything of a heading", () => {
    expect(checkAnswer(field({ kind: "section", required: true }), null)).toBeNull();
  });

  it("checks a number, a date and a choice", () => {
    expect(checkAnswer(field({ kind: "number" }), "twelve")).toBe("form.error.number");
    expect(checkAnswer(field({ kind: "number" }), "12")).toBeNull();

    expect(checkAnswer(field({ kind: "date" }), "01/05/2026")).toBe("form.error.date");
    expect(checkAnswer(field({ kind: "date" }), "2026-05-01")).toBeNull();

    const pick = field({ kind: "select", options: ["Yes", "No"] });
    expect(checkAnswer(pick, "Maybe")).toBe("form.error.choice");
    expect(checkAnswer(pick, "Yes")).toBeNull();
  });

  it("checks every one of several choices", () => {
    const many = field({ kind: "multi_select", options: ["A", "B", "C"] });
    expect(checkAnswer(many, ["A", "C"])).toBeNull();
    expect(checkAnswer(many, ["A", "Z"])).toBe("form.error.choice");
  });

  it("reports one error a question, over the whole form", () => {
    const fields = [
      field({ id: "a", required: true }),
      field({ id: "b", kind: "number" }),
      field({ id: "c", kind: "section" }),
    ];
    expect(checkSubmission(fields, { b: "nope" })).toEqual([
      { fieldId: "a", message: "form.error.required" },
      { fieldId: "b", message: "form.error.number" },
    ]);
    expect(checkSubmission(fields, { a: "Ada", b: 3 })).toEqual([]);
  });

  it("names what stops a form being opened", () => {
    expect(formProblems([field({ kind: "section" })])).toEqual(["form.problem.noQuestions"]);
    expect(formProblems([field({ kind: "select", options: [] })]))
      .toContain("form.problem.noChoices");
    expect(formProblems([field()])).toEqual([]);
  });

  it("makes a link out of a name", () => {
    expect(formSlug("Connection card")).toBe("connection-card");
    expect(formSlug("  St. Mark's  Sign-up!  ")).toBe("st-marks-sign-up");
    expect(formSlug("!!!")).toBe("form");
  });
});

describe("building one", () => {
  it("creates a form, as a draft, with its own link", async () => {
    form = (await run((tx) =>
      createForm(tx, as(), { name: "  Connection   card  ", intro: "Welcome." }),
    )).id;

    const made = await run((tx) => getForm(tx, form));
    expect(made).toMatchObject({
      name: "Connection card",
      slug: "connection-card",
      status: "draft",
      intro: "Welcome.",
    });
    expect(made!.problems).toEqual(["form.problem.noQuestions"]);
  });

  it("gives a second form of the same name its own link", async () => {
    const second = await run((tx) => createForm(tx, as(), { name: "Connection card" }));
    expect((await run((tx) => getForm(tx, second.id)))!.slug).toBe("connection-card-2");
  });

  it("takes every kind of question", async () => {
    for (const kind of FORM_FIELD_KINDS) {
      await run((tx) =>
        addFormField(tx, as(), form, {
          kind,
          label: `A ${kind}`,
          options: kind === "select" || kind === "multi_select" ? ["One", "Two"] : null,
        }),
      );
    }

    const made = await run((tx) => getForm(tx, form));
    expect(made!.fields.map((f) => f.kind)).toEqual([...FORM_FIELD_KINDS]);
    expect(made!.problems).toEqual([]);
  });

  it("tidies a pasted list of choices", async () => {
    const made = await run((tx) =>
      addFormField(tx, as(), form, {
        kind: "select",
        label: "Which service",
        options: ["  Morning ", "Evening", "", "Morning", "   "],
      }),
    );

    const found = (await run((tx) => getForm(tx, form)))!
      .fields.find((f) => f.id === made.id)!;
    expect(found.options).toEqual(["Morning", "Evening"]);
  });

  it("refuses a question with choices and no choices, and a blank one", async () => {
    await expect(
      run((tx) => addFormField(tx, as(), form, { kind: "select", label: "Nothing", options: [] })),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      run((tx) => addFormField(tx, as(), form, { kind: "text", label: "  " })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("never lets a heading be required", async () => {
    const made = await run((tx) =>
      addFormField(tx, as(), form, { kind: "section", label: "About you", required: true }),
    );
    const found = (await run((tx) => getForm(tx, form)))!
      .fields.find((f) => f.id === made.id)!;
    expect(found.required).toBe(false);
  });

  it("moves a question, and stays put at the ends", async () => {
    const before = (await run((tx) => getForm(tx, form)))!.fields;
    const second = before[1]!;

    await run((tx) => moveFormField(tx, as(), { formId: form, id: second.id, direction: "up" }));
    expect((await run((tx) => getForm(tx, form)))!.fields[0]!.id).toBe(second.id);

    await run((tx) => moveFormField(tx, as(), { formId: form, id: second.id, direction: "up" }));
    expect((await run((tx) => getForm(tx, form)))!.fields[0]!.id).toBe(second.id);
  });

  it("edits and removes a question", async () => {
    const made = await run((tx) =>
      addFormField(tx, as(), form, { kind: "text", label: "Temporary" }),
    );
    await run((tx) =>
      updateFormField(tx, as(), made.id, { kind: "long_text", label: "Tell us more", required: true }),
    );

    const found = (await run((tx) => getForm(tx, form)))!
      .fields.find((f) => f.id === made.id)!;
    expect(found).toMatchObject({ kind: "long_text", label: "Tell us more", required: true });

    await run((tx) => removeFormField(tx, as(), made.id));
    expect((await run((tx) => getForm(tx, form)))!.fields.map((f) => f.id))
      .not.toContain(made.id);
  });
});

describe("opening and putting away", () => {
  it("refuses to open a form that asks nothing", async () => {
    const empty = await run((tx) => createForm(tx, as(), { name: "Empty" }));
    await expect(
      run((tx) => setFormStatus(tx, as(), empty.id, "open")),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("opens one that is ready, and closes it again", async () => {
    await run((tx) => setFormStatus(tx, as(), form, "open"));
    expect((await run((tx) => getForm(tx, form)))!.status).toBe("open");

    await run((tx) => setFormStatus(tx, as(), form, "closed"));
    expect((await run((tx) => getForm(tx, form)))!.status).toBe("closed");
  });

  it("takes a limit, and refuses a silly one", async () => {
    await run((tx) => updateForm(tx, as(), form, { name: "Connection card", submissionLimit: 12 }));
    expect((await run((tx) => getForm(tx, form)))!.submissionLimit).toBe(12);

    await expect(
      run((tx) => updateForm(tx, as(), form, { name: "Connection card", submissionLimit: 0 })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("puts a form away closed, and brings it back", async () => {
    await run((tx) => setFormStatus(tx, as(), form, "open"));
    await run((tx) => setFormArchived(tx, as(), form, true));

    const away = await run((tx) => getForm(tx, form));
    expect(away!.archivedAt).toBeTruthy();
    expect(away!.status).toBe("closed");
    expect((await run((tx) => listForms(tx))).map((f) => f.id)).not.toContain(form);
    expect((await run((tx) => listForms(tx, { includeArchived: true }))).map((f) => f.id))
      .toContain(form);

    await run((tx) => setFormArchived(tx, as(), form, false));
    expect((await run((tx) => getForm(tx, form)))!.archivedAt).toBeNull();
  });

  it("counts the questions and leaves the headings out of the count", async () => {
    const summary = (await run((tx) => listForms(tx))).find((f) => f.id === form)!;
    const made = await run((tx) => getForm(tx, form));
    const asked = made!.fields.filter((f) => f.kind !== "section").length;
    expect(summary.questions).toBe(asked);
  });

  it("is refused to anybody who cannot administer the church", async () => {
    for (const role of ["staff", "member"] as TenantRole[]) {
      await expect(
        run((tx) => createForm(tx, as(role), { name: "Nope" }), role),
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });
});
