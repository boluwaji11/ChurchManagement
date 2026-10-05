import { sql, type SQL } from "drizzle-orm";
import type { Tx } from "../client";
import {
  SUBJECTS, fieldOf, cleanSpec, SCREEN_LIMIT,
  type ReportSpec, type SubjectKey, type FieldKind, type ValueWell,
} from "./report-spec";

/**
 * R18.x. Turning a built report into one query.
 *
 * Nothing a church types reaches the database as SQL. The builder sends keys,
 * every key is looked up in the catalogue, and the expressions below are the
 * only SQL there is. A value typed into a filter is always bound as a
 * parameter, never pasted into a string.
 *
 * Row-level security still applies underneath all of it, because every one of
 * these runs inside withTenant like everything else. This file decides what a
 * church can ask about its own records, not whose records it can see.
 */

/** What each subject counts, and what it has to join to count it. */
const FROM: Record<SubjectKey, SQL> = {
  members: sql`from members p`,
  attendance: sql`
    from attendance_records a
    join service_occurrences o on o.id = a.occurrence_id
    join members p on p.id = a.member_id`,
  followups: sql`
    from follow_ups f
    join members p on p.id = f.member_id
    left join app_users u on u.id = f.assignee_user_id
    left join pipeline_entries pe on pe.id = f.entry_id
    left join pipelines pl on pl.id = pe.pipeline_id`,
};

/** What is never in a report, whatever was asked for. */
const BASE: Record<SubjectKey, SQL> = {
  members: sql`p.archived_at is null`,
  attendance: sql`p.archived_at is null and o.status <> 'cancelled'`,
  followups: sql`p.archived_at is null`,
};

const PERSON_NAME = sql`coalesce(nullif(p.preferred_name, ''), p.first_name) || ' ' || p.last_name`;
const LAST_SEEN = sql`(select max(o2.occurs_on) from attendance_records a2
                        join service_occurrences o2 on o2.id = a2.occurrence_id
                       where a2.member_id = p.id)`;
const VISITS = sql`(select count(distinct o2.occurs_on) from attendance_records a2
                     join service_occurrences o2 on o2.id = a2.occurrence_id
                    where a2.member_id = p.id)`;

const EXPR: Record<SubjectKey, Record<string, SQL>> = {
  members: {
    name: PERSON_NAME,
    status: sql`p.lifecycle_status`,
    age: sql`date_part('year', age(p.date_of_birth))`,
    birthMonth: sql`extract(month from p.date_of_birth)`,
    joinedOn: sql`p.membership_date`,
    firstVisitOn: sql`p.first_visit_on`,
    lastSeenOn: LAST_SEEN,
    visits: VISITS,
    household: sql`(select h.name from household_memberships hm
                     join households h on h.id = hm.household_id
                    where hm.member_id = p.id and hm.ended_on is null limit 1)`,
    inGroup: sql`exists (select 1 from group_memberships m where m.member_id = p.id)`,
    serving: sql`exists (select 1 from team_members tm where tm.member_id = p.id)`,
    hasEmail: sql`exists (select 1 from contact_methods c
                           where c.member_id = p.id and c.kind = 'email' and c.is_valid)`,
    hasPhone: sql`exists (select 1 from contact_methods c
                           where c.member_id = p.id and c.kind = 'phone')`,
    campus: sql`(select cp.name from campuses cp where cp.id = p.campus_id)`,
  },
  attendance: {
    name: PERSON_NAME,
    service: sql`o.name`,
    date: sql`o.occurs_on`,
    month: sql`to_char(o.occurs_on, 'YYYY-MM')`,
    weekday: sql`extract(dow from o.occurs_on)`,
    status: sql`p.lifecycle_status`,
    source: sql`a.source`,
    // Which visit this was for them, counted up to and including this day.
    visitNumber: sql`(select count(distinct o2.occurs_on) from attendance_records a2
                       join service_occurrences o2 on o2.id = a2.occurrence_id
                      where a2.member_id = a.member_id and o2.occurs_on <= o.occurs_on)`,
  },
  followups: {
    name: PERSON_NAME,
    step: sql`f.title`,
    pipeline: sql`pl.name`,
    owner: sql`coalesce(nullif(u.full_name, ''), u.email)`,
    dueOn: sql`f.due_on`,
    done: sql`f.done_at is not null`,
    overdue: sql`(f.done_at is null and f.due_on is not null and f.due_on < current_date)`,
    daysOpen: sql`(coalesce(f.done_at::date, current_date) - f.created_at::date)`,
  },
};

const exprOf = (subject: SubjectKey, key: string): SQL | null => EXPR[subject]?.[key] ?? null;

/**
 * What the Values well compiles to, in one place, because both grouped paths
 * ask for it.
 *
 * An empty well counts the rows, which is what a chart with nothing in Values
 * falls back to in every tool of this kind.
 */
function measureOf(subject: SubjectKey, values: ValueWell[]): SQL {
  const one = values[0];
  if (!one) return sql`count(*)`;

  const expr = one.field ? exprOf(subject, one.field) : null;
  if (!expr) return one.agg === "distinct" ? sql`count(distinct p.id)` : sql`count(*)`;

  switch (one.agg) {
    case "sum": return sql`coalesce(sum(${expr}), 0)`;
    case "average": return sql`coalesce(round(avg(${expr})), 0)`;
    case "distinct": return sql`count(distinct ${expr})`;
    default: return sql`count(${expr})`;
  }
}

/** One condition, as SQL, with whatever was typed bound rather than pasted. */
function conditionSql(subject: SubjectKey, field: string, op: string, value: string): SQL | null {
  const expr = exprOf(subject, field);
  const def = fieldOf(subject, field);
  if (!expr || !def) return null;

  switch (op) {
    case "contains":
      return sql`${expr} ilike ${"%" + value + "%"}`;
    case "is":
      return def.kind === "number"
        ? sql`${expr} = ${Number(value)}`
        : sql`lower(${expr}::text) = lower(${value})`;
    case "isNot":
      return def.kind === "number"
        ? sql`${expr} <> ${Number(value)}`
        : sql`lower(${expr}::text) is distinct from lower(${value})`;
    case "atLeast":
      return sql`${expr} >= ${Number(value)}`;
    case "atMost":
      return sql`${expr} <= ${Number(value)}`;
    case "onOrAfter":
      return sql`${expr} >= ${value}::date`;
    case "onOrBefore":
      return sql`${expr} <= ${value}::date`;
    case "lastDays":
      return sql`${expr} >= current_date - ${Math.max(1, Math.round(Number(value) || 0))}`;
    case "empty":
      return sql`${expr} is null`;
    case "notEmpty":
      return sql`${expr} is not null`;
    case "yes":
      return sql`${expr} = true`;
    case "no":
      return sql`coalesce(${expr}, false) = false`;
    default:
      return null;
  }
}

export interface ReportColumn {
  key: string;
  label: string;
  kind: FieldKind;
}

export interface ReportGrid {
  /** One per answer on the first dimension, in the order they are drawn. */
  labels: string[];
  /** One per answer on the second, each carrying a value per label. */
  series: { name: string; values: number[] }[];
}

export interface ReportResult {
  columns: ReportColumn[];
  /** Every value as text, so one shape serves a date, a count and a name. */
  rows: string[][];
  /** Set when the report is counted by a field, for the chart. */
  chart: { label: string; value: number }[] | null;
  /** Set when it is counted by two, which is a chart of series. */
  grid: ReportGrid | null;
  /** The measure added up across every answer, where the report asked. */
  total: number | null;
  /** True where the answer was longer than the limit and was cut. */
  more: boolean;
}

/**
 * R18.x. Runs a built report.
 *
 * Counted by a field, it comes back as one row per answer and a number, which
 * is what a chart is drawn from. Otherwise it is the list itself.
 */
export async function runReport(
  db: Tx,
  raw: unknown,
  opts: { limit?: number } = {},
): Promise<ReportResult> {
  const spec: ReportSpec = cleanSpec(raw);
  const limit = Math.min(opts.limit ?? SCREEN_LIMIT, 5000);
  const subject = spec.subject;

  // The conditions join one way for the whole set. Mixing and with or needs
  // brackets, and brackets need a church to think about precedence, which is
  // the point where a builder stops being usable. Two questions make two
  // reports.
  const conditions: SQL[] = [];
  for (const one of spec.filters) {
    const piece = conditionSql(subject, one.field, one.op, one.value);
    if (piece) conditions.push(piece);
  }

  const narrowed =
    conditions.length === 0
      ? null
      : sql`(${sql.join(conditions, spec.join === "or" ? sql` or ` : sql` and `)})`;

  const whereSql = narrowed ? sql`${BASE[subject]} and ${narrowed}` : BASE[subject];

  if (spec.groupBy && spec.splitBy) {
    const by = exprOf(subject, spec.groupBy)!;
    const split = exprOf(subject, spec.splitBy)!;
    const measureSql = measureOf(subject, spec.values);

    const rows = await db.execute<{ label: string | null; series: string | null; value: string }>(sql`
      select (${by})::text as label, (${split})::text as series, (${measureSql})::text as value
        ${FROM[subject]}
       where ${whereSql}
       group by 1, 2
       order by 1, 2
       limit ${limit}`);

    // The order of the labels is the order of their totals, so the biggest
    // answer leads and a top-N cut keeps the ones worth keeping.
    const totals = new Map<string, number>();
    for (const row of rows) {
      const key = row.label ?? "";
      totals.set(key, (totals.get(key) ?? 0) + Number(row.value));
    }
    let labels = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
    if (spec.topN) labels = labels.slice(0, spec.topN);

    const names = [...new Set(rows.map((row) => row.series ?? ""))];
    const at = new Map(labels.map((label, i) => [label, i]));

    const series = names.map((name) => {
      const values = new Array<number>(labels.length).fill(0);
      for (const row of rows) {
        if ((row.series ?? "") !== name) continue;
        const i = at.get(row.label ?? "");
        if (i !== undefined) values[i] = Number(row.value);
      }
      return { name, values };
    });

    return {
      columns: [
        { key: spec.groupBy, label: fieldOf(subject, spec.groupBy)!.label, kind: "text" },
        { key: spec.splitBy, label: fieldOf(subject, spec.splitBy)!.label, kind: "text" },
        { key: "value", label: "report.measure.value", kind: "number" },
      ],
      rows: rows
        .filter((row) => at.has(row.label ?? ""))
        .map((row) => [row.label ?? "", row.series ?? "", row.value]),
      chart: null,
      grid: { labels, series },
      total: spec.totals
        ? series.reduce((all, one) => all + one.values.reduce((sum, v) => sum + v, 0), 0)
        : null,
      more: rows.length >= limit,
    };
  }

  if (spec.groupBy) {
    const by = exprOf(subject, spec.groupBy)!;
    const measureSql = measureOf(subject, spec.values);

    const rows = await db.execute<{ label: string | null; value: string }>(sql`
      select (${by})::text as label, (${measureSql})::text as value
        ${FROM[subject]}
       where ${whereSql}
       group by 1
       -- By the measure itself rather than by the output column: the value is
       -- cast to text for the screen, and ordering text puts 44 above 168.
       order by ${measureSql} desc nulls last
       limit ${spec.topN ?? limit}`);

    return {
      columns: [
        { key: spec.groupBy, label: fieldOf(subject, spec.groupBy)!.label, kind: "text" },
        { key: "value", label: "report.measure.value", kind: "number" },
      ],
      rows: rows.map((row) => [row.label ?? "", row.value]),
      chart: rows.map((row) => ({ label: row.label ?? "", value: Number(row.value) })),
      grid: null,
      total: spec.totals
        ? rows.reduce((all, row) => all + Number(row.value), 0)
        : null,
      more: rows.length >= limit,
    };
  }

  const picked = spec.columns
    .map((key) => ({ key, def: fieldOf(subject, key)!, expr: exprOf(subject, key)! }))
    .filter((one) => one.def && one.expr);

  // Aliased c0, c1, c2 rather than left unnamed. Postgres calls an unnamed
  // expression "?column?", every one of them, and a row object cannot hold the
  // same key twice: two unnamed columns would come back as one. The names are
  // generated here, so nothing a church typed reaches the query as an
  // identifier.
  const selected = sql.join(
    picked.map((one, i) => sql`(${one.expr})::text as ${sql.raw(`c${i}`)}`),
    sql`, `,
  );

  const sortExpr = spec.sort ? exprOf(subject, spec.sort.field) : null;
  const order = sortExpr
    ? spec.sort!.dir === "asc"
      ? sql`order by ${sortExpr} asc nulls last`
      : sql`order by ${sortExpr} desc nulls last`
    : sql`order by 1 asc`;

  const rows = await db.execute<Record<string, string | null>>(sql`
    select ${selected}
      ${FROM[subject]}
     where ${whereSql}
     ${order}
     limit ${limit}`);

  return {
    columns: picked.map((one) => ({ key: one.key, label: one.def.label, kind: one.def.kind })),
    rows: rows.map((row) => picked.map((_, i) => row[`c${i}`] ?? "")),
    chart: null,
    grid: null,
    total: null,
    more: rows.length >= limit,
  };
}

/** The subjects this session may build a report on. */
export const subjectsFor = (): SubjectKey[] => Object.keys(SUBJECTS) as SubjectKey[];
