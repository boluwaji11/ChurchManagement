/**
 * R4.1, R4.2, R4.9. What a form holds, which parts of it a reader sees, and
 * whether an answer is good enough.
 *
 * Pure: no database, nothing that cannot be served to a browser. The builder
 * previews a form as it is written and the public form checks answers before it
 * sends them, and both run this rather than two versions of it that disagree
 * about whether an empty string is an answer.
 */

/** R4.1. Every kind of question a church can ask, plus the heading between them. */
export const FORM_FIELD_KINDS = [
  "text", "long_text", "number", "date",
  "select", "multi_select", "checkbox", "file",
  "section",
] as const;
export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number];

/** A section is a heading. It has no answer, so nothing is ever required of it. */
export const ANSWERABLE = FORM_FIELD_KINDS.filter((kind) => kind !== "section");

/** The kinds that need a list of choices before they mean anything. */
export const NEEDS_OPTIONS: readonly FormFieldKind[] = ["select", "multi_select"];

export type FormStatus = "draft" | "open" | "closed";

/**
 * R4.2. How a question can wait on an earlier answer.
 *
 * "is" and "is_not" match a value. On a choose-several question "is" means the
 * value is among the ones picked. "answered" and "blank" ask only whether
 * anything was put in, which covers the common case of a follow-up to an
 * optional question without the church having to name a value.
 */
export const CONDITION_OPS = ["is", "is_not", "answered", "blank"] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

/** The ops that match against a value, so the value cannot be left blank. */
export const OPS_NEED_VALUE: readonly ConditionOp[] = ["is", "is_not"];

export interface FormCondition {
  /** The earlier question this one waits on. */
  fieldId: string;
  op: ConditionOp;
  /** Null for "answered" and "blank". */
  value: string | null;
}

export interface FormFieldDef {
  id: string;
  kind: FormFieldKind;
  label: string;
  help: string | null;
  required: boolean;
  options: string[] | null;
  position: number;
  /** R4.2. What has to be true earlier for this one to be shown. */
  showWhen?: FormCondition | null;
}

/** An answer as the form holds it, before anything is done with it. */
export type FormAnswer = string | number | boolean | string[] | null;

export interface FieldError {
  fieldId: string;
  /** A message key, so the screen says it in the reader's own language. */
  message: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whether somebody has actually answered. Empty text and an empty list have not. */
export function answered(answer: FormAnswer): boolean {
  if (answer === null || answer === undefined) return false;
  if (typeof answer === "string") return answer.trim() !== "";
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "boolean") return answer;
  return true;
}

/**
 * R4.9. Checks one answer against the question that was asked.
 *
 * Returns a message key or null. The rules are deliberately few: a church
 * writing a form does not want to configure a regular expression, and a product
 * that asks it to has already lost the volunteer.
 */
export function checkAnswer(field: FormFieldDef, answer: FormAnswer): string | null {
  if (field.kind === "section") return null;

  if (!answered(answer)) {
    return field.required ? "form.error.required" : null;
  }

  switch (field.kind) {
    case "number": {
      const value = typeof answer === "number" ? answer : Number(String(answer).trim());
      return Number.isFinite(value) ? null : "form.error.number";
    }

    case "date":
      return ISO_DATE.test(String(answer)) && !Number.isNaN(Date.parse(String(answer)))
        ? null
        : "form.error.date";

    case "select":
      return (field.options ?? []).includes(String(answer)) ? null : "form.error.choice";

    case "multi_select": {
      const chosen = Array.isArray(answer) ? answer : [String(answer)];
      const allowed = field.options ?? [];
      return chosen.every((one) => allowed.includes(one)) ? null : "form.error.choice";
    }

    case "checkbox":
      return typeof answer === "boolean" ? null : "form.error.checkbox";

    case "text":
      return String(answer).length <= 500 ? null : "form.error.long";

    case "long_text":
      return String(answer).length <= 5000 ? null : "form.error.long";

    default:
      return null;
  }
}

/** R4.2. Whether one condition holds, given what has been answered so far. */
export function conditionHolds(
  condition: FormCondition,
  controller: FormFieldDef | undefined,
  answer: FormAnswer,
): boolean {
  if (!controller) return true;

  switch (condition.op) {
    case "answered":
      return answered(answer);
    case "blank":
      return !answered(answer);
    case "is":
    case "is_not": {
      const want = (condition.value ?? "").trim();
      const hit = Array.isArray(answer)
        ? answer.includes(want)
        : typeof answer === "boolean"
          ? answer === (want === "true" || want.toLowerCase() === "yes")
          : String(answer ?? "").trim() === want;
      return condition.op === "is" ? hit : !hit;
    }
    default:
      return true;
  }
}

/**
 * R4.2. Which questions the reader is shown, in order.
 *
 * A question whose condition points at a hidden question is hidden too, which
 * is what a church means by putting a follow-up under a follow-up. Conditions
 * only ever point backwards, so one pass down the list settles every one of
 * them and there is no loop to guard against.
 */
export function visibleFields(
  fields: FormFieldDef[],
  answers: Record<string, FormAnswer>,
): FormFieldDef[] {
  const shown = new Map<string, boolean>();
  const out: FormFieldDef[] = [];

  for (const field of fields) {
    const condition = field.showWhen ?? null;
    let visible = true;

    if (condition) {
      const controller = fields.find((one) => one.id === condition.fieldId);
      visible = (shown.get(condition.fieldId) ?? true)
        && conditionHolds(condition, controller, answers[condition.fieldId] ?? null);
    }

    shown.set(field.id, visible);
    if (visible) out.push(field);
  }
  return out;
}

/**
 * R4.2. Drops the answers to questions the reader never saw.
 *
 * Somebody answers a follow-up, changes the earlier answer, and the follow-up
 * disappears with their words still in it. What they were last shown is what
 * gets recorded.
 */
export function prunedAnswers(
  fields: FormFieldDef[],
  answers: Record<string, FormAnswer>,
): Record<string, FormAnswer> {
  const keep = new Set(visibleFields(fields, answers).map((field) => field.id));
  const out: Record<string, FormAnswer> = {};
  for (const [id, answer] of Object.entries(answers)) {
    if (keep.has(id)) out[id] = answer;
  }
  return out;
}

/**
 * R4.9. Every answer, against every question the reader was shown.
 *
 * A required question inside a hidden branch is not required of somebody who
 * never saw it, so visibility is settled first and R4.2 and R4.9 cannot
 * disagree about whether a form can be sent.
 */
export function checkSubmission(
  fields: FormFieldDef[],
  answers: Record<string, FormAnswer>,
): FieldError[] {
  const out: FieldError[] = [];
  for (const field of visibleFields(fields, answers)) {
    const message = checkAnswer(field, answers[field.id] ?? null);
    if (message) out.push({ fieldId: field.id, message });
  }
  return out;
}

/**
 * R4.1. Whether a form is ready to be put in front of anybody.
 *
 * A form of three headings and no questions asks nothing, and a select with no
 * choices is a question nobody can answer. Both are easy to leave half-built
 * and neither is obvious from the screen.
 */
export function formProblems(fields: FormFieldDef[]): string[] {
  const out: string[] = [];

  if (!fields.some((field) => field.kind !== "section")) {
    out.push("form.problem.noQuestions");
  }
  if (fields.some((f) => NEEDS_OPTIONS.includes(f.kind) && (f.options ?? []).length === 0)) {
    out.push("form.problem.noChoices");
  }
  if (fields.some((f) => conditionProblem(fields, f) !== null)) {
    out.push("form.problem.condition");
  }
  return out;
}

/**
 * R4.2. Whether one question's condition still makes sense.
 *
 * Reordering is where this breaks: a question moved above the one it waits on
 * is waiting on an answer nobody has given yet. The builder can let the move
 * happen and say so here rather than refusing a drag for a reason that is hard
 * to explain mid-gesture.
 */
export function conditionProblem(
  fields: FormFieldDef[],
  field: FormFieldDef,
): string | null {
  const condition = field.showWhen ?? null;
  if (!condition) return null;

  const at = fields.findIndex((one) => one.id === field.id);
  const controllerAt = fields.findIndex((one) => one.id === condition.fieldId);
  if (controllerAt === -1) return "form.error.conditionField";
  if (controllerAt >= at) return "form.error.conditionOrder";

  const controller = fields[controllerAt]!;
  if (controller.kind === "section") return "form.error.conditionField";

  if (OPS_NEED_VALUE.includes(condition.op)) {
    const value = (condition.value ?? "").trim();
    if (!value) return "form.error.conditionValue";
    if (NEEDS_OPTIONS.includes(controller.kind) && !(controller.options ?? []).includes(value)) {
      return "form.error.conditionValue";
    }
  }
  return null;
}

/** "Connection card" becomes "connection-card", for the public link. */
export function formSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "form";
}
