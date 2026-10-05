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
    { key: "joinedOn", label: "report.field.joinedOn", kind: "date", groupable: true },
    { key: "firstVisitOn", label: "report.field.firstVisitOn", kind: "date", groupable: true },
    { key: "lastSeenOn", label: "report.field.lastSeenOn", kind: "date", groupable: true },
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
    { key: "date", label: "report.field.date", kind: "date", groupable: true },
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
    { key: "dueOn", label: "report.field.dueOn", kind: "date", groupable: true },
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

/** How a field in the Values well is added up. */
export const AGGREGATIONS = ["sum", "average", "count", "distinct"] as const;
export type Aggregation = (typeof AGGREGATIONS)[number];

export interface ValueWell {
  /** The field being aggregated. Absent means the rows themselves. */
  field?: string;
  agg: Aggregation;
}

/** How the answer is drawn. */
export const VIEWS = ["table", "number", "bar", "rows", "stacked", "donut", "line", "area"] as const;
export type View = (typeof VIEWS)[number];

/** The ones that need the report to be counted by a field to mean anything. */
export const GROUPED_VIEWS = new Set<View>(["bar", "rows", "stacked", "donut", "line", "area"]);

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

/** What a well comes to, for the chart's own axis label. */
export function wellLabel(value: ValueWell | undefined, rowsLabel: string): string {
  if (!value) return rowsLabel;
  return value.field ? `${value.agg}:${value.field}` : rowsLabel;
}

/** The hues a visual can be drawn in. The spectrum, at matched lightness. */
export const CHART_HUES = [
  "indigo", "sky", "teal", "fern", "citron", "amber", "clay", "rose", "violet",
] as const;
export type ChartHue = (typeof CHART_HUES)[number];

export const CHART_SORTS = ["value", "label"] as const;
export type ChartSort = (typeof CHART_SORTS)[number];

/**
 * R18.12. How a visual looks, as against what it says.
 *
 * Every tool of this kind keeps these apart, and so does this: what is being
 * counted is one pane, how it is drawn is another, and nobody hunting for a
 * colour has to read past a field list to find it.
 */
export interface ReportLook {
  hue: ChartHue;
  /** The number on each bar, slice or point. */
  labels: boolean;
  /** The key naming the series. */
  legend: boolean;
  /** The lines across the plot. */
  grid: boolean;
  /** Ordered by what it counted, or by what it is counting. */
  sort: ChartSort;
  dir: "asc" | "desc";
}

export const DEFAULT_LOOK: ReportLook = {
  hue: "indigo",
  labels: false,
  legend: true,
  grid: true,
  sort: "value",
  dir: "desc",
};

export interface ReportSpec {
  subject: SubjectKey;
  filters: Condition[];
  /** Whether every condition has to hold, or any one of them. */
  join: "and" | "or";
  /** What the list shows, in this order. Ignored once it is counted by a field. */
  columns: string[];
  /** Counted by this field, which turns the list into a chart and a summary. */
  groupBy: string | null;
  /**
   * A second field, which splits every answer into series. "Attendance by
   * month, split by service" is two questions a church asks as one.
   */
  splitBy: string | null;
  /** Keep only the biggest few answers, which is how a long tail is read. */
  topN: number | null;
  /** Add the column up and say so under it. */
  totals: boolean;
  /**
   * What is being counted. Empty is the rows themselves, which is what every
   * chart falls back to, so the well can be emptied rather than only swapped.
   */
  values: ValueWell[];
  sort: { field: string; dir: "asc" | "desc" } | null;
  /** How it is drawn. */
  view: View;
  /** And how that drawing looks. */
  look: ReportLook;
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

  // A split with nothing to split is meaningless, and splitting a field by
  // itself is a chart of one series.
  const splitBy =
    groupBy && input.splitBy && input.splitBy !== groupBy
      && fieldOf(subject, input.splitBy)?.groupable
      ? input.splitBy
      : null;

  const topN =
    typeof input.topN === "number" && input.topN >= 3 && input.topN <= 50
      ? Math.round(input.topN)
      : null;

  // Reports saved before the well existed carry a measure instead.
  const fromMeasure = (): ValueWell[] => {
    const old = (input as { measure?: Measure }).measure;
    if (!old) return [];
    if (old.kind === "members") return [{ agg: "distinct" }];
    if ((old.kind === "sum" || old.kind === "average") && old.field) {
      return fieldOf(subject, old.field)?.numeric ? [{ agg: old.kind, field: old.field }] : [];
    }
    return [];
  };

  const values: ValueWell[] = (Array.isArray(input.values) ? input.values : fromMeasure())
    .map((one) => {
      const agg: Aggregation = AGGREGATIONS.includes(one?.agg as Aggregation)
        ? (one.agg as Aggregation)
        : "sum";
      if (!one?.field) {
        return { agg: agg === "sum" || agg === "average" ? "count" : agg } as ValueWell;
      }
      const field = fieldOf(subject, one.field);
      if (!field) return null;
      // A name cannot be summed. Counting one is fine.
      const settled: Aggregation =
        (agg === "sum" || agg === "average") && !field.numeric ? "count" : agg;
      return { agg: settled, field: field.key } as ValueWell;
    })
    .filter((one): one is ValueWell => one !== null)
    .slice(0, 1);

  // A chart of a list is a chart of nothing, so a view that needs a count
  // falls back to the table rather than drawing an empty frame.
  let view: View = VIEWS.includes(input.view as View) ? (input.view as View) : "table";
  if (!groupBy && GROUPED_VIEWS.has(view)) view = "table";

  const sortField = input.sort?.field ? fieldOf(subject, input.sort.field) : null;
  const sort = sortField
    ? { field: sortField.key, dir: input.sort?.dir === "asc" ? ("asc" as const) : ("desc" as const) }
    : null;

  const asked = (input.look ?? {}) as Partial<ReportLook>;
  const look: ReportLook = {
    hue: CHART_HUES.includes(asked.hue as ChartHue) ? (asked.hue as ChartHue) : DEFAULT_LOOK.hue,
    labels: asked.labels === undefined ? DEFAULT_LOOK.labels : Boolean(asked.labels),
    legend: asked.legend === undefined ? DEFAULT_LOOK.legend : Boolean(asked.legend),
    grid: asked.grid === undefined ? DEFAULT_LOOK.grid : Boolean(asked.grid),
    sort: CHART_SORTS.includes(asked.sort as ChartSort)
      ? (asked.sort as ChartSort)
      : DEFAULT_LOOK.sort,
    dir: asked.dir === "asc" ? "asc" : "desc",
  };

  return {
    subject,
    filters,
    join: input.join === "or" ? "or" : "and",
    // A list with no columns is a blank screen, so it falls back to the first few.
    columns: columns.length > 0 ? columns : def.fields.slice(0, 4).map((one) => one.key),
    groupBy,
    splitBy,
    topN,
    totals: Boolean(input.totals),
    values,
    sort,
    view,
    look,
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
  // One bar split into its parts. More than a dozen and the thin slices stop
  // being anything anybody can point at.
  stacked: { grouped: true, readableUpTo: 12 },
  donut: { grouped: true, readableUpTo: 9 },
  line: { grouped: true, readableUpTo: 60 },
  area: { grouped: true, readableUpTo: 60 },
};

/** Whether this report can be drawn this way as it stands. */
export const viewFits = (view: View, spec: { groupBy: string | null }): boolean =>
  !VIEW_NEEDS[view].grouped || Boolean(spec.groupBy);

/** The visualizations that can draw a second dimension as series. */
export const SPLIT_VIEWS = new Set<View>(["bar", "stacked"]);

/**
 * R18.12. Where a visual sits on the page.
 *
 * A twelve-column grid, which is what every tool of this kind lands on: wide
 * enough to halve, third and quarter, and small enough that a church dragging
 * a tile does not have to be precise.
 */
export interface TilePlace {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const GRID_COLUMNS = 12;

export interface ReportTile extends ReportSpec {
  id: string;
  /** What the church called it. Empty means the chart names itself. */
  title: string;
  place: TilePlace;
}

/**
 * R18.12. A report is a page of visuals.
 *
 * Tableau calls the single-visual thing a worksheet and the page of them a
 * dashboard; Power BI puts several on one canvas and calls the lot a report.
 * Both arrive at the same place, which is that one question rarely has one
 * picture, and this follows them.
 */
export interface ReportPage {
  tiles: ReportTile[];
}

const whole = (value: unknown, fallback: number, low: number, high: number): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(high, Math.max(low, n)) : fallback;
};

/**
 * Everything the builder sent, reduced to a page this catalogue recognises.
 *
 * A report saved before the page existed is one spec rather than a list of
 * them, and it opens as a single tile filling the width.
 */
export function cleanPage(raw: unknown): ReportPage {
  const input = (raw ?? {}) as Partial<ReportPage>;
  const list = Array.isArray(input.tiles) ? input.tiles : null;

  if (!list) {
    return {
      tiles: [
        {
          ...cleanSpec(raw),
          id: "1",
          title: "",
          place: { x: 0, y: 0, w: GRID_COLUMNS, h: 4 },
        },
      ],
    };
  }

  return {
    tiles: list.slice(0, 12).map((tile, i) => {
      const w = whole(tile?.place?.w, 6, 2, GRID_COLUMNS);
      return {
        ...cleanSpec(tile),
        id: String(tile?.id ?? i + 1).slice(0, 24),
        title: String(tile?.title ?? "").slice(0, 80),
        place: {
          w,
          h: whole(tile?.place?.h, 4, 2, 12),
          // A tile cannot start so far right that it hangs off the page.
          x: whole(tile?.place?.x, 0, 0, GRID_COLUMNS - w),
          y: whole(tile?.place?.y, 0, 0, 200),
        },
      };
    }),
  };
}
