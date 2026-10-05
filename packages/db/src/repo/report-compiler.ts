import { sql, type SQL } from "drizzle-orm";
import type { Tx } from "../client";
import {
  SUBJECTS, fieldOf, cleanSpec, SCREEN_LIMIT,
  type ReportSpec, type SubjectKey, type FieldKind,
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
  people: sql`from people p`,
  attendance: sql`
    from attendance_records a
    join service_occurrences o on o.id = a.occurrence_id
    join people p on p.id = a.person_id`,
  followups: sql`
    from follow_ups f
    join people p on p.id = f.person_id
    left join app_users u on u.id = f.assignee_user_id
    left join pipeline_entries pe on pe.id = f.entry_id
    left join pipelines pl on pl.id = pe.pipeline_id`,
};

/** What is never in a report, whatever was asked for. */
const BASE: Record<SubjectKey, SQL> = {
  people: sql`p.archived_at is null`,
  attendance: sql`p.archived_at is null and o.status <> 'cancelled'`,
  followups: sql`p.archived_at is null`,
};

const PERSON_NAME = sql`coalesce(nullif(p.preferred_name, ''), p.first_name) || ' ' || p.last_name`;
const LAST_SEEN = sql`(select max(o2.occurs_on) from attendance_records a2
                        join service_occurrences o2 on o2.id = a2.occurrence_id
                       where a2.person_id = p.id)`;
const VISITS = sql`(select count(distinct o2.occurs_on) from attendance_records a2
                     join service_occurrences o2 on o2.id = a2.occurrence_id
                    where a2.person_id = p.id)`;

const EXPR: Record<SubjectKey, Record<string, SQL>> = {
  people: {
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
                    where hm.person_id = p.id and hm.ended_on is null limit 1)`,
    inGroup: sql`exists (select 1 from group_memberships m where m.person_id = p.id)`,
    serving: sql`exists (select 1 from team_members tm where tm.person_id = p.id)`,
    hasEmail: sql`exists (select 1 from contact_methods c
                           where c.person_id = p.id and c.kind = 'email' and c.is_valid)`,
    hasPhone: sql`exists (select 1 from contact_methods c
                           where c.person_id = p.id and c.kind = 'phone')`,
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
                      where a2.person_id = a.person_id and o2.occurs_on <= o.occurs_on)`,
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

export interface ReportResult {
  columns: ReportColumn[];
  /** Every value as text, so one shape serves a date, a count and a name. */
  rows: string[][];
  /** Set when the report is counted by a field, for the chart. */
  chart: { label: string; value: number }[] | null;
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

  if (spec.groupBy) {
    const by = exprOf(subject, spec.groupBy)!;
    const measure = spec.measure ?? { kind: "rows" as const };
    const measureSql =
      measure.kind === "people"
        ? sql`count(distinct p.id)`
        : measure.kind === "sum" && measure.field
          ? sql`coalesce(sum(${exprOf(subject, measure.field)!}), 0)`
          : measure.kind === "average" && measure.field
            ? sql`coalesce(round(avg(${exprOf(subject, measure.field)!})), 0)`
            : sql`count(*)`;

    const rows = await db.execute<{ label: string | null; value: string }>(sql`
      select (${by})::text as label, (${measureSql})::text as value
        ${FROM[subject]}
       where ${whereSql}
       group by 1
       -- By the measure itself rather than by the output column: the value is
       -- cast to text for the screen, and ordering text puts 44 above 168.
       order by ${measureSql} desc nulls last
       limit ${limit}`);

    return {
      columns: [
        { key: spec.groupBy, label: fieldOf(subject, spec.groupBy)!.label, kind: "text" },
        { key: "value", label: "report.measure.value", kind: "number" },
      ],
      rows: rows.map((row) => [row.label ?? "", row.value]),
      chart: rows.map((row) => ({ label: row.label ?? "", value: Number(row.value) })),
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
    more: rows.length >= limit,
  };
}

/** The subjects this session may build a report on. */
export const subjectsFor = (): SubjectKey[] => Object.keys(SUBJECTS) as SubjectKey[];
