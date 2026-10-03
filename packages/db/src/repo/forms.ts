import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { forms, formFields } from "../schema/forms";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";
import {
  FORM_FIELD_KINDS, NEEDS_OPTIONS, formSlug, formProblems,
  type FormFieldDef, type FormFieldKind, type FormStatus,
} from "./form-rules";
import type { WriteActor } from "./people";

export * from "./form-rules";

/**
 * R4.1, R4.9. Building a form.
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
  status: FormStatus;
  questions: number;
  archivedAt: string | null;
}

export interface FormInput {
  name: string;
  intro?: string | null;
  thanks?: string | null;
  submissionLimit?: number | null;
}

export interface FormFieldInput {
  kind: FormFieldKind;
  label: string;
  help?: string | null;
  required?: boolean;
  options?: string[] | null;
}

const NAME_LIMIT = 120;

function checkForm(input: FormInput): {
  name: string;
  intro: string | null;
  thanks: string | null;
  submissionLimit: number | null;
} {
  const name = input.name?.trim().replace(/\s+/g, " ");
  if (!name) throw new InvalidInputError("form.error.name");

  const limit = input.submissionLimit ?? null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 100_000)) {
    throw new InvalidInputError("form.error.limit");
  }

  return {
    name: name.slice(0, NAME_LIMIT),
    intro: input.intro?.trim() || null,
    thanks: input.thanks?.trim() || null,
    submissionLimit: limit,
  };
}

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
  };
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
    })
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(asc(formFields.position), asc(formFields.createdAt));

  return rows.map((row) => ({ ...row, kind: row.kind as FormFieldKind }));
}

/** R4.1. Every form this church has, with how many questions each asks. */
export async function listForms(
  db: Tx,
  opts: { includeArchived?: boolean } = {},
): Promise<FormSummary[]> {
  const rows = await db
    .select({
      id: forms.id,
      name: forms.name,
      slug: forms.slug,
      status: forms.status,
      archivedAt: forms.archivedAt,
      questions: sql<number>`count(${formFields.id}) filter (where ${formFields.kind} <> 'section')::int`,
    })
    .from(forms)
    .leftJoin(formFields, eq(formFields.formId, forms.id))
    .where(opts.includeArchived ? undefined : sql`${forms.archivedAt} is null`)
    .groupBy(forms.id, forms.name, forms.slug, forms.status, forms.archivedAt)
    .orderBy(asc(forms.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as FormStatus,
    questions: row.questions,
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

  const [last] = await db
    .select({ at: sql<number>`coalesce(max(${formFields.position}), -1)::int` })
    .from(formFields)
    .where(eq(formFields.formId, formId));

  const [row] = await db
    .insert(formFields)
    .values({
      tenantId: actor.tenantId,
      formId,
      ...values,
      position: (last?.at ?? -1) + 1,
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

  const changed = await db
    .update(formFields)
    .set({ ...values, updatedAt: new Date() })
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
