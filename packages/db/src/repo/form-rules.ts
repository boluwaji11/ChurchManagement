/**
 * R4.1, R4.9. What a form holds, and whether an answer is good enough.
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

export interface FormFieldDef {
  id: string;
  kind: FormFieldKind;
  label: string;
  help: string | null;
  required: boolean;
  options: string[] | null;
  position: number;
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

/** R4.9. Every answer, against every question. Empty means it can be sent. */
export function checkSubmission(
  fields: FormFieldDef[],
  answers: Record<string, FormAnswer>,
): FieldError[] {
  const out: FieldError[] = [];
  for (const field of fields) {
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
  return out;
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
