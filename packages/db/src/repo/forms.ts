import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { forms, formFields, formSubmissions } from "../schema/forms";
import { people } from "../schema/people";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";
import {
  FORM_FIELD_KINDS, NEEDS_OPTIONS, CONDITION_OPS, OPS_NEED_VALUE,
  formSlug, formProblems, conditionProblem, targetAllowed,
  type ConditionOp, type FormAnswer, type FormCondition, type FormFieldDef,
  type FormFieldKind, type FormStatus,
} from "./form-rules";
import type { WriteActor } from "./people";

export * from "./form-rules";

/**
 * R4.1, R4.2, R4.9. Building a form.
 *
 * A church writes the questions once and the answers land on people's records,
 * which is the whole point of R4.4. This story is the writing: the kinds of
 * question, the headings between them, what is required, and what stops a
 * half-built form being put in front of anybody.
 *
 * Who may build one is Owner and Admin. A form is a thing the public can reach
 * and a question the church is seen to be asking, which is not a decision for
 * whoever is nearest the keyboard.
 */

export interface Form {
  id: string;
  name: string;
  intro: string | null;
  hue: string;
  coverKey: string | null;
  slug: string;
  status: FormStatus;
  submissionLimit: number | null;
  thanks: string | null;
  archivedAt: string | null;
  fields: FormFieldDef[];
  /** R4.1. What stops it being opened, empty when nothing does. */
  problems: string[];
}

export interface FormSummary {
  id: string;
  name: string;
  slug: string;
  hue: string;
  status: FormStatus;
  questions: number;
  /** R4.4. How many people have answered it. */
  responses: number;
  archivedAt: string | null;
}

export interface FormInput {
  name: string;
  intro?: string | null;
  thanks?: string | null;
  submissionLimit?: number | null;
  /** R24.4. One of the twelve, or left as it is. */
  hue?: string | null;
}

export interface FormFieldInput {
  kind: FormFieldKind;
  label: string;
  help?: string | null;
  required?: boolean;
  options?: string[] | null;
  /** R4.2. Null, or the earlier answer this question waits on. */
  showWhen?: FormCondition | null;
  /** R4.4. Null, or which part of a person's record this answer is. */
  mapsTo?: string | null;
}

const NAME_LIMIT = 120;

function checkForm(input: FormInput): {
  name: string;
  intro: string | null;
  thanks: string | null;
  submissionLimit: number | null;
  hue?: FormHue;
} {
  const name = input.name?.trim().replace(/\s+/g, " ");
  if (!name) throw new InvalidInputError("form.error.name");

  const limit = input.submissionLimit ?? null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 100_000)) {
    throw new InvalidInputError("form.error.limit");
  }

  const chosen = input.hue?.trim() || null;
  if (chosen && !FORM_HUES.includes(chosen as FormHue)) {
    throw new InvalidInputError("form.error.hue");
  }

  return {
    name: name.slice(0, NAME_LIMIT),
    intro: input.intro?.trim() || null,
    thanks: input.thanks?.trim() || null,
    submissionLimit: limit,
    // Left out entirely when nothing was chosen, so an update that says nothing
    // about colour does not reset it.
    ...(chosen ? { hue: chosen as FormHue } : {}),
  };
}

/** R24.4. The twelve the storage enum permits. */
export const FORM_HUES = [
  "rose", "coral", "amber", "citron", "fern", "jade",
  "teal", "sky", "indigo", "violet", "orchid", "clay",
] as const;
export type FormHue = (typeof FORM_HUES)[number];

/**
 * R4.1. Checks one question.
 *
 * The choices are cleaned here rather than on the screen: blanks dropped,
 * duplicates dropped, order kept. A church pasting a list out of a spreadsheet
 * should not have to tidy it first.
 */
function checkField(input: FormFieldInput): {
  kind: FormFieldKind;
  label: string;
  help: string | null;
  required: boolean;
  options: string[] | null;
  showWhen: FormCondition | null;
  mapsTo: string | null;
} {
  if (!FORM_FIELD_KINDS.includes(input.kind)) throw new InvalidInputError("form.error.kind");

  const label = input.label?.trim();
  if (!label) throw new InvalidInputError("form.error.label");

  let options: string[] | null = null;
  if (NEEDS_OPTIONS.includes(input.kind)) {
    const cleaned = [...new Set((input.options ?? []).map((o) => o.trim()).filter(Boolean))];
    if (cleaned.length === 0) throw new InvalidInputError("form.error.choices");
    options = cleaned;
  }

  return {
    kind: input.kind,
    label: label.slice(0, 300),
    help: input.help?.trim() || null,
    // A heading has no answer, so nothing can be required of it.
    required: input.kind === "section" ? false : Boolean(input.required),
    options,
    showWhen: checkCondition(input.showWhen ?? null),
    mapsTo: checkTarget(input.kind, input.mapsTo ?? null),
  };
}

/**
 * R4.4. Holds the chosen target against the kind of question.
 *
 * An email address cannot be somebody's date of birth, and a heading is not
 * anything at all. Refused here rather than quietly cleared, because a church
 * that picked a target meant to pick one.
 */
function checkTarget(kind: FormFieldKind, target: string | null): string | null {
  const cleaned = target?.trim() || null;
  if (!targetAllowed(kind, cleaned)) throw new InvalidInputError("form.error.target");
  return cleaned;
}

/** R4.2. The shape of a condition, before it is held against the form. */
function checkCondition(condition: FormCondition | null): FormCondition | null {
  if (!condition || !condition.fieldId) return null;
  if (!CONDITION_OPS.includes(condition.op)) throw new InvalidInputError("form.error.conditionOp");

  const value = OPS_NEED_VALUE.includes(condition.op)
    ? (condition.value ?? "").trim()
    : null;
  if (value === "") throw new InvalidInputError("form.error.conditionValue");

  return { fieldId: condition.fieldId, op: condition.op as ConditionOp, value };
}

/**
 * R4.2. Holds a condition against the rest of the form.
 *
 * The question it waits on has to exist, has to come before it, and has to be
 * something with an answer. `candidate` is the form as it will be once this
 * question is saved, so a condition is checked against the order it will
 * actually be read in.
 */
function holdCondition(candidate: FormFieldDef[], field: FormFieldDef): void {
  const problem = conditionProblem(candidate, field);
  if (problem) throw new InvalidInputError(problem as never);
}

async function fieldsFor(db: Tx, formId: string): Promise<FormFieldDef[]> {
  const rows = await db
    .select({
      id: formFields.id,
      kind: formFields.kind,
      label: formFields.label,
      help: formFields.help,
      required: formFields.required,
      options: formFields.options,
      position: formFields.position,
      showWhenFieldId: formFields.showWhenFieldId,
      showWhenOp: formFields.showWhenOp,
      showWhenValue: formFields.showWhenValue,
      mapsTo: formFields.mapsTo,
    })
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(asc(formFields.position), asc(formFields.createdAt));

  return rows.map(({ showWhenFieldId, showWhenOp, showWhenValue, ...row }) => ({
    ...row,
    kind: row.kind as FormFieldKind,
    showWhen: showWhenFieldId && showWhenOp
      ? { fieldId: showWhenFieldId, op: showWhenOp as ConditionOp, value: showWhenValue }
      : null,
  }));
}

/** R4.1. Every form this church has, with how many questions each asks. */
export async function listForms(
  db: Tx,
  opts: { includeArchived?: boolean; archivedOnly?: boolean } = {},
): Promise<FormSummary[]> {
  const rows = await db
    .select({
      id: forms.id,
      name: forms.name,
      slug: forms.slug,
      hue: forms.hue,
      status: forms.status,
      archivedAt: forms.archivedAt,
      questions: sql<number>`count(${formFields.id}) filter (where ${formFields.kind} <> 'section')::int`,
      responses: sql<number>`(select count(*) from ${formSubmissions}
        where ${formSubmissions.formId} = ${forms.id})::int`,
    })
    .from(forms)
    .leftJoin(formFields, eq(formFields.formId, forms.id))
    .where(
      opts.archivedOnly
        ? sql`${forms.archivedAt} is not null`
        : opts.includeArchived
          ? undefined
          : sql`${forms.archivedAt} is null`,
    )
    .groupBy(forms.id, forms.name, forms.slug, forms.hue, forms.status, forms.archivedAt, forms.createdAt)
    .orderBy(desc(forms.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    hue: row.hue,
    status: row.status as FormStatus,
    questions: row.questions,
    responses: row.responses,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  }));
}

export async function getForm(db: Tx, id: string): Promise<Form | null> {
  const [row] = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  if (!row) return null;

  const fields = await fieldsFor(db, row.id);
  return {
    id: row.id,
    name: row.name,
    intro: row.intro,
    hue: row.hue,
    coverKey: row.coverKey,
    slug: row.slug,
    status: row.status as FormStatus,
    submissionLimit: row.submissionLimit,
    thanks: row.thanks,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    fields,
    problems: formProblems(fields),
  };
}

/** The public part of the link, unique within the church. */
async function freeSlug(db: Tx, name: string, exclude?: string): Promise<string> {
  const base = formSlug(name);
  for (let n = 1; n < 200; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [clash] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(exclude
        ? and(eq(forms.slug, candidate), ne(forms.id, exclude))
        : eq(forms.slug, candidate))
      .limit(1);
    if (!clash) return candidate;
  }
  throw new InvalidInputError("form.error.name");
}

export async function createForm(
  db: Tx,
  actor: WriteActor,
  input: FormInput,
): Promise<{ id: string }> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");
  const values = checkForm(input);

  const [row] = await db
    .insert(forms)
    .values({ tenantId: actor.tenantId, ...values, slug: await freeSlug(db, values.name) })
    .returning({ id: forms.id });
  return { id: row!.id };
}

export async function updateForm(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: FormInput,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");
  const values = checkForm(input);

  const changed = await db
    .update(forms)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(forms.id, id))
    .returning({ id: forms.id });
  if (changed.length === 0) throw new InvalidInputError("form.error.missing");
}

/**
 * R4.1. Opens a form, or closes it.
 *
 * Opening is refused while anything would make it unanswerable, because the
 * moment a form is open somebody can be looking at it, and a select with no
 * choices is a question with no answer.
 */
export async function setFormStatus(
  db: Tx,
  actor: WriteActor,
  id: string,
  status: FormStatus,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");

  const form = await getForm(db, id);
  if (!form) throw new InvalidInputError("form.error.missing");
  if (status === "open" && form.problems.length > 0) {
    throw new InvalidInputError(form.problems[0] as never);
  }

  await db
    .update(forms)
    .set({ status, updatedAt: new Date() })
    .where(eq(forms.id, id));
}

/**
 * R4.1. Puts a form away.
 *
 * Archived rather than deleted, because a form with answers under it is the
 * question that explains every one of them.
 */
export async function setFormArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");

  const changed = await db
    .update(forms)
    .set({
      archivedAt: archived ? new Date() : null,
      // An archived form is not an open one.
      ...(archived ? { status: "closed" as const } : {}),
      updatedAt: new Date(),
    })
    .where(eq(forms.id, id))
    .returning({ id: forms.id });
  if (changed.length === 0) throw new InvalidInputError("form.error.missing");
}

export async function addFormField(
  db: Tx,
  actor: WriteActor,
  formId: string,
  input: FormFieldInput,
): Promise<{ id: string }> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");
  const values = checkField(input);

  const existing = await fieldsFor(db, formId);
  const position = existing.length === 0
    ? 0
    : Math.max(...existing.map((field) => field.position)) + 1;

  // A new question goes last, so any question already on the form is a
  // candidate for it to wait on. Checked against the order it will be read in.
  const { showWhen, ...column } = values;
  holdCondition(
    [...existing, { ...column, id: "new", position, showWhen }],
    { ...column, id: "new", position, showWhen },
  );

  const [row] = await db
    .insert(formFields)
    .values({
      tenantId: actor.tenantId,
      formId,
      ...column,
      position,
      showWhenFieldId: showWhen?.fieldId ?? null,
      showWhenOp: showWhen?.op ?? null,
      showWhenValue: showWhen?.value ?? null,
    })
    .returning({ id: formFields.id });
  return { id: row!.id };
}

export async function updateFormField(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: FormFieldInput,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");
  const values = checkField(input);

  const [found] = await db
    .select({ formId: formFields.formId, position: formFields.position })
    .from(formFields)
    .where(eq(formFields.id, id))
    .limit(1);
  if (!found) throw new InvalidInputError("form.error.field");

  const { showWhen, ...column } = values;
  const after = { ...column, id, position: found.position, showWhen };
  holdCondition(
    (await fieldsFor(db, found.formId)).map((field) => (field.id === id ? after : field)),
    after,
  );

  const changed = await db
    .update(formFields)
    .set({
      ...column,
      showWhenFieldId: showWhen?.fieldId ?? null,
      showWhenOp: showWhen?.op ?? null,
      showWhenValue: showWhen?.value ?? null,
      updatedAt: new Date(),
    })
    .where(eq(formFields.id, id))
    .returning({ id: formFields.id });
  if (changed.length === 0) throw new InvalidInputError("form.error.field");
}

export async function removeFormField(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");

  const removed = await db
    .delete(formFields)
    .where(eq(formFields.id, id))
    .returning({ id: formFields.id });
  if (removed.length === 0) throw new InvalidInputError("form.error.field");

  // R4.2. The column drops to null on delete. Clearing the rest of the
  // condition with it keeps every condition pointing at a question that exists,
  // so a question that waited on this one is now simply always shown.
  await db
    .update(formFields)
    .set({ showWhenOp: null, showWhenValue: null, updatedAt: new Date() })
    .where(and(sql`${formFields.showWhenFieldId} is null`, sql`${formFields.showWhenOp} is not null`));
}

/** R4.1. Moves one question up or down, which is how a form gets its order. */
export async function moveFormField(
  db: Tx,
  actor: WriteActor,
  input: { formId: string; id: string; direction: "up" | "down" },
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");

  const fields = await fieldsFor(db, input.formId);
  const at = fields.findIndex((field) => field.id === input.id);
  if (at === -1) throw new InvalidInputError("form.error.field");

  const to = input.direction === "up" ? at - 1 : at + 1;
  if (to < 0 || to >= fields.length) return;

  const reordered = [...fields];
  const [moved] = reordered.splice(at, 1);
  reordered.splice(to, 0, moved!);

  for (const [position, field] of reordered.entries()) {
    await db
      .update(formFields)
      .set({ position, updatedAt: new Date() })
      .where(eq(formFields.id, field.id));
  }
}

/**
 * R4.1. Puts the questions in the order they were dragged into.
 *
 * The whole list arrives rather than one move, because a drag can carry a
 * question past several others and the screen already knows where everything
 * landed. Anything left out keeps its place at the end, so a list that has gone
 * stale cannot drop a question off the form.
 */
export async function reorderFormFields(
  db: Tx,
  actor: WriteActor,
  formId: string,
  ids: string[],
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");

  const fields = await fieldsFor(db, formId);
  const known = new Set(fields.map((field) => field.id));
  const wanted = ids.filter((id) => known.has(id));
  const rest = fields.filter((field) => !wanted.includes(field.id)).map((field) => field.id);

  for (const [position, id] of [...wanted, ...rest].entries()) {
    await db
      .update(formFields)
      .set({ position, updatedAt: new Date() })
      .where(eq(formFields.id, id));
  }
}

/** R4.1. How many forms have been put away, for the link that goes to them. */
export async function countArchivedForms(db: Tx): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(forms)
    .where(sql`${forms.archivedAt} is not null`);
  return row?.count ?? 0;
}

export interface FormSubmission {
  id: string;
  receivedAt: string;
  /** Question id to what was given, the shape `FormAnswer` describes. */
  answers: Record<string, FormAnswer>;
  /** R4.4. Who it turned out to be, where anybody is sure. */
  personId: string | null;
  personName: string | null;
  /** "created", "matched", "review" or "none". */
  matchState: string;
}

/**
 * R4.4. What has been sent in, newest first.
 *
 * The answers come back keyed by question rather than flattened into columns,
 * because a question that was removed still has answers under it and a church
 * reading an old submission wants what it actually said.
 */
export async function listSubmissions(
  db: Tx,
  formId: string,
  window: { limit: number; offset: number } = { limit: 20, offset: 0 },
): Promise<FormSubmission[]> {
  const rows = await db
    .select({
      id: formSubmissions.id,
      createdAt: formSubmissions.createdAt,
      answers: formSubmissions.answers,
      personId: formSubmissions.personId,
      matchState: formSubmissions.matchState,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
    })
    .from(formSubmissions)
    .leftJoin(people, eq(people.id, formSubmissions.personId))
    .where(eq(formSubmissions.formId, formId))
    .orderBy(desc(formSubmissions.createdAt))
    .limit(window.limit)
    .offset(window.offset);

  return rows.map((row) => ({
    id: row.id,
    receivedAt: row.createdAt.toISOString(),
    answers: (row.answers ?? {}) as Record<string, FormAnswer>,
    personId: row.personId,
    personName: row.firstName
      ? `${row.preferredName ?? row.firstName} ${row.lastName}`.trim()
      : null,
    matchState: row.matchState,
  }));
}

/** R4.4. How many have been sent in, for the numbered pages under them. */
export async function countSubmissions(db: Tx, formId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, formId));
  return row?.count ?? 0;
}

/**
 * R4.1. Puts a picture across the top of a form, or takes it off.
 *
 * Returns the key that is no longer wanted, so the caller can take the bytes
 * out of the bucket and leave the ledger and the object store agreeing.
 */
export async function setFormCover(
  db: Tx,
  actor: WriteActor,
  id: string,
  key: string | null,
): Promise<{ removed: string | null }> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");

  const [row] = await db
    .select({ coverKey: forms.coverKey })
    .from(forms)
    .where(eq(forms.id, id))
    .limit(1);
  if (!row) throw new InvalidInputError("form.error.missing");

  await db
    .update(forms)
    .set({ coverKey: key, updatedAt: new Date() })
    .where(eq(forms.id, id));

  return { removed: row.coverKey && row.coverKey !== key ? row.coverKey : null };
}

/**
 * R24.4. The colour a form wears.
 *
 * Its own function rather than part of `updateForm`, because changing a colour
 * is one press on a swatch and should not require the screen to hand back every
 * other field to avoid clearing one.
 */
export async function setFormHue(
  db: Tx,
  actor: WriteActor,
  id: string,
  value: string,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageForms");
  if (!FORM_HUES.includes(value as FormHue)) throw new InvalidInputError("form.error.hue");

  const changed = await db
    .update(forms)
    .set({ hue: value as FormHue, updatedAt: new Date() })
    .where(eq(forms.id, id))
    .returning({ id: forms.id });
  if (changed.length === 0) throw new InvalidInputError("form.error.missing");
}
