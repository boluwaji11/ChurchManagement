/**
 * R18.x. What a church is allowed to ask for when it builds its own report.
 *
 * A fixed vocabulary rather than a query language. Three subjects, a known set
 * of fields on each, and operators that come from the kind of field. Nothing
 * here is free text that reaches the database: the builder sends keys, the
 * server looks every key up in this catalogue, and anything it does not
 * recognise is dropped on the floor.
 *
 * That is also what keeps the thing usable. A builder that can express any
 * question is a builder nobody can operate, and the churches this is for have
 * one volunteer with four hours a week. Twenty fields she recognises beat a
 * join picker.
 *
 * Pure on purpose: the builder screen reads this in the browser, and the
 * compiler reads the same copy on the server, so the two can never disagree
 * about what exists.
 */

export type FieldKind = "text" | "number" | "date" | "choice" | "boolean";

export interface FieldDef {
  key: string;
  /** The catalogue key for its name on screen. */
  label: string;
  kind: FieldKind;
  /** The answers, where the field has a fixed set of them. */
  choices?: readonly string[];
  /** Whether a report can be counted by this field. */
  groupable?: boolean;
  /** Whether it can be added up or averaged. */
  numeric?: boolean;
}

export interface SubjectDef {
  key: SubjectKey;
  label: string;
  /** What one row stands for, for the measure "how many". */
  rowLabel: string;
  fields: readonly FieldDef[];
}

export const SUBJECT_KEYS = ["members", "attendance", "followups"] as const;
export type SubjectKey = (typeof SUBJECT_KEYS)[number];

export const LIFECYCLE_CHOICES = [
  "visitor", "regular_attender", "member", "inactive", "deceased",
] as const;

/**
 * The members in the church's records.
 *
 * Nothing sensitive is offered here on purpose. Allergies, medical notes and
 * pastoral notes are readable on the person and at check-in by the members who
 * need them, and an ad-hoc report that can list every child's medical note is a
 * safeguarding problem waiting to be exported to a laptop.
 */
const PEOPLE: SubjectDef = {
  key: "members",
  label: "report.subject.members",
  rowLabel: "report.row.members",
  fields: [
    { key: "name", label: "report.field.name", kind: "text" },
    { key: "status", label: "report.field.status", kind: "choice", choices: LIFECYCLE_CHOICES, groupable: true },
    { key: "age", label: "report.field.age", kind: "number", numeric: true },
    { key: "birthMonth", label: "report.field.birthMonth", kind: "number", groupable: true },
    { key: "joinedOn", label: "report.field.joinedOn", kind: "date" },
    { key: "firstVisitOn", label: "report.field.firstVisitOn", kind: "date" },
    { key: "lastSeenOn", label: "report.field.lastSeenOn", kind: "date" },
    { key: "visits", label: "report.field.visits", kind: "number", numeric: true },
    { key: "household", label: "report.field.household", kind: "text", groupable: true },
    { key: "inGroup", label: "report.field.inGroup", kind: "boolean", groupable: true },
    { key: "serving", label: "report.field.serving", kind: "boolean", groupable: true },
    { key: "hasEmail", label: "report.field.hasEmail", kind: "boolean", groupable: true },
    { key: "hasPhone", label: "report.field.hasPhone", kind: "boolean", groupable: true },
    { key: "campus", label: "report.field.campus", kind: "text", groupable: true },
  ],
};

/** Every time somebody was marked present. */
const ATTENDANCE: SubjectDef = {
  key: "attendance",
  label: "report.subject.attendance",
  rowLabel: "report.row.attendance",
  fields: [
    { key: "name", label: "report.field.name", kind: "text" },
    { key: "service", label: "report.field.service", kind: "text", groupable: true },
    { key: "date", label: "report.field.date", kind: "date" },
    { key: "month", label: "report.field.month", kind: "text", groupable: true },
    { key: "weekday", label: "report.field.weekday", kind: "number", groupable: true },
    { key: "status", label: "report.field.status", kind: "choice", choices: LIFECYCLE_CHOICES, groupable: true },
    { key: "visitNumber", label: "report.field.visitNumber", kind: "number", numeric: true },
    { key: "source", label: "report.field.source", kind: "choice",
      choices: ["roster", "checkin", "import"], groupable: true },
  ],
};

/** Every follow-up step, answered or waiting. */
const FOLLOWUPS: SubjectDef = {
  key: "followups",
  label: "report.subject.followups",
  rowLabel: "report.row.followups",
  fields: [
    { key: "name", label: "report.field.name", kind: "text" },
    { key: "step", label: "report.field.step", kind: "text", groupable: true },
    { key: "pipeline", label: "report.field.pipeline", kind: "text", groupable: true },
    { key: "owner", label: "report.field.owner", kind: "text", groupable: true },
    { key: "dueOn", label: "report.field.dueOn", kind: "date" },
    { key: "done", label: "report.field.done", kind: "boolean", groupable: true },
    { key: "overdue", label: "report.field.overdue", kind: "boolean", groupable: true },
    { key: "daysOpen", label: "report.field.daysOpen", kind: "number", numeric: true },
  ],
};

export const SUBJECTS: Record<SubjectKey, SubjectDef> = {
  members: PEOPLE,
  attendance: ATTENDANCE,
  followups: FOLLOWUPS,
};

/** What can be asked of a field, by what kind of field it is. */
export const OPERATORS: Record<FieldKind, readonly string[]> = {
  text: ["contains", "is", "isNot", "empty", "notEmpty"],
  number: ["is", "atLeast", "atMost"],
  date: ["onOrAfter", "onOrBefore", "lastDays", "empty", "notEmpty"],
  choice: ["is", "isNot"],
  boolean: ["yes", "no"],
};

/** The operators that stand on their own, with nothing typed after them. */
export const BARE_OPERATORS = new Set(["empty", "notEmpty", "yes", "no"]);

export type MeasureKind = "rows" | "members" | "sum" | "average";

/** How the answer is drawn. */
export const VIEWS = ["table", "number", "bar", "rows", "donut", "line"] as const;
export type View = (typeof VIEWS)[number];

/** The ones that need the report to be counted by a field to mean anything. */
export const GROUPED_VIEWS = new Set<View>(["bar", "rows", "donut", "line"]);

export interface Condition {
  field: string;
  op: string;
  value: string;
}

export interface Measure {
  kind: MeasureKind;
  /** The field being added up, for sum and average. */
  field?: string;
}

export interface ReportSpec {
  subject: SubjectKey;
  filters: Condition[];
  /** Whether every condition has to hold, or any one of them. */
  join: "and" | "or";
  /** What the list shows, in this order. Ignored once it is counted by a field. */
  columns: string[];
  /** Counted by this field, which turns the list into a chart and a summary. */
  groupBy: string | null;
  measure: Measure | null;
  sort: { field: string; dir: "asc" | "desc" } | null;
  /** How it is drawn. */
  view: View;
}

/** How many rows a built report ever puts on screen. */
export const SCREEN_LIMIT = 500;
/** And how many it will write to a file. */
export const FILE_LIMIT = 5000;

export const fieldOf = (subject: SubjectKey, key: string): FieldDef | null =>
  SUBJECTS[subject]?.fields.find((one) => one.key === key) ?? null;

/**
 * Everything the builder sent, reduced to what this catalogue recognises.
 *
 * Run on the way in and again on the way out, so a spec saved against an older
 * catalogue cannot bring a field back that no longer exists.
 */
export function cleanSpec(raw: unknown): ReportSpec {
  const input = (raw ?? {}) as Partial<ReportSpec>;
  const subject: SubjectKey = SUBJECT_KEYS.includes(input.subject as SubjectKey)
    ? (input.subject as SubjectKey)
    : "members";
  const def = SUBJECTS[subject];

  const filters: Condition[] = (Array.isArray(input.filters) ? input.filters : [])
    .map((one) => {
      const field = fieldOf(subject, String(one?.field ?? ""));
      if (!field) return null;
      const op = String(one?.op ?? "");
      if (!OPERATORS[field.kind].includes(op)) return null;
      const value = String(one?.value ?? "").slice(0, 200);
      if (!BARE_OPERATORS.has(op) && value.trim() === "") return null;
      return { field: field.key, op, value };
    })
    .filter((one): one is Condition => one !== null)
    .slice(0, 10);

  const known = new Set(def.fields.map((one) => one.key));
  const columns = (Array.isArray(input.columns) ? input.columns : [])
    .map(String)
    .filter((one) => known.has(one))
    .slice(0, 12);

  const groupBy =
    input.groupBy && fieldOf(subject, input.groupBy)?.groupable ? input.groupBy : null;

  let measure: Measure | null = null;
  if (groupBy) {
    const kind = input.measure?.kind;
    if (kind === "sum" || kind === "average") {
      const field = input.measure?.field ? fieldOf(subject, input.measure.field) : null;
      measure = field?.numeric ? { kind, field: field.key } : { kind: "rows" };
    } else {
      measure = { kind: kind === "members" ? "members" : "rows" };
    }
  }

  // A chart of a list is a chart of nothing, so a view that needs a count
  // falls back to the table rather than drawing an empty frame.
  let view: View = VIEWS.includes(input.view as View) ? (input.view as View) : "table";
  if (!groupBy && GROUPED_VIEWS.has(view)) view = "table";

  const sortField = input.sort?.field ? fieldOf(subject, input.sort.field) : null;
  const sort = sortField
    ? { field: sortField.key, dir: input.sort?.dir === "asc" ? ("asc" as const) : ("desc" as const) }
    : null;

  return {
    subject,
    filters,
    join: input.join === "or" ? "or" : "and",
    // A list with no columns is a blank screen, so it falls back to the first few.
    columns: columns.length > 0 ? columns : def.fields.slice(0, 4).map((one) => one.key),
    groupBy,
    measure,
    sort,
    view,
  };
}

/** What a visualization needs on its shelves before it can draw anything. */
export interface ViewNeeds {
  /** Whether the report has to be grouped by a field. */
  grouped: boolean;
  /** How many answers it can show before it stops being readable. */
  readableUpTo?: number;
}

export const VIEW_NEEDS: Record<View, ViewNeeds> = {
  table: { grouped: false },
  number: { grouped: false },
  bar: { grouped: true, readableUpTo: 24 },
  rows: { grouped: true, readableUpTo: 20 },
  // A ring of thirty slices is a ring nobody can read, and the answer to that
  // is to say so rather than to draw it.
  donut: { grouped: true, readableUpTo: 9 },
  line: { grouped: true, readableUpTo: 60 },
};

/** Whether this report can be drawn this way as it stands. */
export const viewFits = (view: View, spec: { groupBy: string | null }): boolean =>
  !VIEW_NEEDS[view].grouped || Boolean(spec.groupBy);
