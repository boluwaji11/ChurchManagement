import { sql } from "drizzle-orm";
import type { Tx } from "../client";

/**
 * R18.1 to R18.4. What a church reads back about itself.
 *
 * Counted from the record every time it is asked rather than kept as a running
 * total, because a total written once is wrong the moment somebody corrects a
 * mistake, backdates a service or imports a year of history. A church that
 * cannot trust a number stops looking at the screen that shows it.
 *
 * Nothing here reads giving. That work is deferred, and a dashboard with a
 * blank where the money should be is worse than a dashboard without it.
 */

export interface ServiceCount {
  occurrenceId: string;
  occursOn: string;
  name: string;
  present: number;
}

/**
 * R18.2. How many were at each of the last gatherings, oldest first.
 *
 * Oldest first because it is drawn as a line of weeks and read left to right.
 * A gathering nobody recorded attendance at is still here with a zero: a gap in
 * the record is a fact about the record, and hiding it makes a church believe
 * it has twelve weeks of numbers when it has nine.
 */
export async function attendanceByService(
  db: Tx,
  opts: { from: string; to: string; limit?: number },
): Promise<ServiceCount[]> {
  const rows = await db.execute<{
    occurrenceId: string;
    occursOn: string;
    name: string;
    present: string;
  }>(sql`
    select o.id as "occurrenceId",
           to_char(o.occurs_on, 'YYYY-MM-DD') as "occursOn",
           o.name,
           (select count(*) from attendance_records a where a.occurrence_id = o.id)::text as present
      from service_occurrences o
     where o.occurs_on between ${opts.from} and ${opts.to}
       and o.status <> 'cancelled'
     order by o.occurs_on, o.starts_at
     limit ${opts.limit ?? 200}`);

  return rows.map((row) => ({ ...row, present: Number(row.present) }));
}

export interface Dashboard {
  /** R18.1. The gathering just held, and how it compares. */
  lastService: { name: string; occursOn: string; present: number; average: number } | null;
  /** R2.1. People first recorded this month. */
  newThisMonth: number;
  /** R7.5. First-time visitors in the last month, and how many nobody has contacted. */
  visitors: { total: number; uncontacted: number };
  /** R5.5. Follow-ups still open, and how many are past their date. */
  followUps: { open: number; overdue: number };
  /** R10.6. Positions on the next gathering with nobody in them. */
  coverageGaps: number;
}

/**
 * R18.1. The five numbers a church opens the week on.
 *
 * `today` is the church's own date, so a Monday morning in Missouri is not a
 * Sunday evening somewhere else.
 */
export async function dashboard(db: Tx, today: string): Promise<Dashboard> {
  const [last] = await db.execute<{
    name: string;
    occursOn: string;
    present: string;
  }>(sql`
    select o.name,
           to_char(o.occurs_on, 'YYYY-MM-DD') as "occursOn",
           (select count(*) from attendance_records a where a.occurrence_id = o.id)::text as present
      from service_occurrences o
     where o.occurs_on <= ${today}
       and o.status <> 'cancelled'
       and exists (select 1 from attendance_records a where a.occurrence_id = o.id)
     order by o.occurs_on desc, o.starts_at desc
     limit 1`);

  // The four before it, so "up on the average" means up on what this church
  // has actually been doing rather than on the same week last year.
  const [average] = last
    ? await db.execute<{ average: string | null }>(sql`
        select round(avg(c.present))::text as average
          from (
            select (select count(*) from attendance_records a where a.occurrence_id = o.id) as present
              from service_occurrences o
             where o.occurs_on < ${last.occursOn}
               and o.status <> 'cancelled'
               and exists (select 1 from attendance_records a where a.occurrence_id = o.id)
             order by o.occurs_on desc
             limit 4
          ) c`)
    : [];

  const [counts] = await db.execute<{
    newThisMonth: string;
    visitors: string;
    uncontacted: string;
    open: string;
    overdue: string;
  }>(sql`
    select
      (select count(*) from people p
        where p.archived_at is null
          and p.created_at >= date_trunc('month', ${today}::date))::text as "newThisMonth",

      -- R7.5. Somebody whose first recorded gathering was in the last month.
      (select count(*) from people p
        where p.archived_at is null
          and p.first_visit_on >= ${today}::date - interval '30 days'
          and p.first_visit_on <= ${today}::date)::text as visitors,

      (select count(*) from people p
        where p.archived_at is null
          and p.first_visit_on >= ${today}::date - interval '30 days'
          and p.first_visit_on <= ${today}::date
          and not exists (
            select 1 from pipeline_entries e where e.person_id = p.id
          ))::text as uncontacted,

      (select count(*) from follow_ups f where f.done_at is null)::text as open,
      (select count(*) from follow_ups f
        where f.done_at is null and f.due_on is not null and f.due_on < ${today}::date)::text as overdue`);

  // R10.6. The next gathering's rota against what each position needs.
  const [gaps] = await db.execute<{ gaps: string }>(sql`
    with next_service as (
      select o.id from service_occurrences o
       where o.occurs_on >= ${today}::date and o.status <> 'cancelled'
       order by o.occurs_on, o.starts_at limit 1
    )
    select coalesce(sum(greatest(0, p.needed - coalesce(filled.n, 0))), 0)::text as gaps
      from team_positions p
      cross join next_service s
      left join (
        select a.position_id, count(*) as n
          from serving_assignments a
          cross join next_service s2
         where a.occurrence_id = s2.id and a.status <> 'declined'
         group by a.position_id
      ) filled on filled.position_id = p.id
     where p.archived_at is null`);

  return {
    lastService: last
      ? {
          name: last.name,
          occursOn: last.occursOn,
          present: Number(last.present),
          average: Number(average?.average ?? 0),
        }
      : null,
    newThisMonth: Number(counts?.newThisMonth ?? 0),
    visitors: {
      total: Number(counts?.visitors ?? 0),
      uncontacted: Number(counts?.uncontacted ?? 0),
    },
    followUps: {
      open: Number(counts?.open ?? 0),
      overdue: Number(counts?.overdue ?? 0),
    },
    coverageGaps: Number(gaps?.gaps ?? 0),
  };
}
