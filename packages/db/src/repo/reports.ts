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
 * R18.2. How many were at each of the last services, oldest first.
 *
 * Oldest first because it is drawn as a line of weeks and read left to right.
 * A service nobody recorded attendance at is still here with a zero: a gap in
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
  /** R18.1. The service just held, and how it compares. */
  lastService: { name: string; occursOn: string; present: number; average: number } | null;
  /** R2.1. People first recorded this month. */
  newThisMonth: number;
  /** R7.5. First-time visitors in the last month, and how many nobody has contacted. */
  visitors: { total: number; uncontacted: number };
  /** R5.5. Follow-ups still open, and how many are past their date. */
  followUps: { open: number; overdue: number };
  /** R10.6. Positions on the next service with nobody in them. */
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

  // R10.6. The next service's rota against what each position needs.
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

export interface FunnelStep {
  /** "visited", "returned", "group", "serving", "member". */
  key: string;
  people: number;
  /** Of the people who reached the step before, how many reached this one. */
  rate: number;
  /** Middle number of days from the first visit to reaching this step. */
  medianDays: number | null;
}

/**
 * R18.3. What happens to somebody after they first turn up.
 *
 * Five steps, each one counted among the people who reached the one before it,
 * so the rate answers "of those who came back, how many joined a group" rather
 * than "what fraction of everybody". That is the question a church is actually
 * asking.
 *
 * The cohort is people whose first recorded service falls in the window. A
 * church that started using Hearth in March cannot be asked about February,
 * and a report that quietly counts the import as a hundred first visits is a
 * report that lies on its most important line.
 *
 * The middle number of days rather than the average, because one person who
 * joined a group four years later should not move the answer for everybody.
 */
export async function visitorFunnel(
  db: Tx,
  opts: { from: string; to: string },
): Promise<FunnelStep[]> {
  const rows = await db.execute<{
    visited: string;
    returned: string;
    grouped: string;
    serving: string;
    member: string;
    daysReturned: string | null;
    daysGroup: string | null;
    daysServing: string | null;
    daysMember: string | null;
  }>(sql`
    with cohort as (
      select p.id, p.first_visit_on, p.membership_date, p.lifecycle_status
        from people p
       where p.archived_at is null
         and p.first_visit_on between ${opts.from} and ${opts.to}
    ),
    marked as (
      select c.id,
             c.first_visit_on,
             -- R7.5. The second distinct day they were recorded present.
             (select min(o.occurs_on)
                from attendance_records a
                join service_occurrences o on o.id = a.occurrence_id
               where a.person_id = c.id
                 and o.occurs_on > c.first_visit_on) as returned_on,
             (select min(m.joined_on) from group_memberships m
               where m.person_id = c.id) as grouped_on,
             (select min(tm.joined_on) from team_members tm
               where tm.person_id = c.id) as serving_on,
             case when c.lifecycle_status = 'member'
                  then coalesce(c.membership_date, c.first_visit_on) end as member_on
        from cohort c
    )
    select count(*)::text as visited,
           count(returned_on)::text as returned,
           count(grouped_on)::text as grouped,
           count(serving_on)::text as serving,
           count(member_on)::text as member,
           percentile_cont(0.5) within group (
             order by (returned_on - first_visit_on)) filter (where returned_on is not null)
             ::text as "daysReturned",
           percentile_cont(0.5) within group (
             order by (grouped_on - first_visit_on)) filter (where grouped_on is not null)
             ::text as "daysGroup",
           percentile_cont(0.5) within group (
             order by (serving_on - first_visit_on)) filter (where serving_on is not null)
             ::text as "daysServing",
           percentile_cont(0.5) within group (
             order by (member_on - first_visit_on)) filter (where member_on is not null)
             ::text as "daysMember"
      from marked`);

  const row = rows[0];
  const n = (value: string | null | undefined) =>
    value === null || value === undefined ? null : Math.round(Number(value));

  const visited = Number(row?.visited ?? 0);
  const returned = Number(row?.returned ?? 0);
  const grouped = Number(row?.grouped ?? 0);
  const serving = Number(row?.serving ?? 0);
  const member = Number(row?.member ?? 0);

  const share = (reached: number, before: number) =>
    before === 0 ? 0 : Math.round((reached / before) * 100);

  return [
    { key: "visited", people: visited, rate: 100, medianDays: 0 },
    { key: "returned", people: returned, rate: share(returned, visited), medianDays: n(row?.daysReturned) },
    { key: "group", people: grouped, rate: share(grouped, returned), medianDays: n(row?.daysGroup) },
    { key: "serving", people: serving, rate: share(serving, grouped), medianDays: n(row?.daysServing) },
    { key: "member", people: member, rate: share(member, returned), medianDays: n(row?.daysMember) },
  ];
}

export interface ServiceAverage {
  name: string;
  held: number;
  average: number;
  best: number;
}

/**
 * R18.2. How each service does, averaged over the window.
 *
 * A church with a nine o'clock and an eleven o'clock wants to know which one is
 * growing, and a single trend line across both cannot say.
 */
export async function attendanceByName(
  db: Tx,
  opts: { from: string; to: string },
): Promise<ServiceAverage[]> {
  const rows = await db.execute<{
    name: string;
    held: string;
    average: string;
    best: string;
  }>(sql`
    select o.name,
           count(*)::text as held,
           round(avg(c.present))::text as average,
           max(c.present)::text as best
      from service_occurrences o
      cross join lateral (
        select count(*) as present from attendance_records a where a.occurrence_id = o.id
      ) c
     where o.occurs_on between ${opts.from} and ${opts.to}
       and o.status <> 'cancelled'
     group by o.name
     order by avg(c.present) desc`);

  return rows.map((row) => ({
    name: row.name,
    held: Number(row.held),
    average: Number(row.average),
    best: Number(row.best),
  }));
}

export interface MonthChange {
  month: string;
  joined: number;
  lapsed: number;
  net: number;
}

/**
 * R18.4. New, lapsed and the net change, month by month.
 *
 * "New" is somebody whose first recorded service was that month. "Lapsed" is
 * somebody who had been coming and whose last recorded service was that
 * month, counted only once enough time has passed to be sure: a church should
 * not be told it lost somebody who was on holiday.
 */
export async function growthByMonth(
  db: Tx,
  opts: { from: string; to: string; quietDays?: number },
): Promise<MonthChange[]> {
  const quiet = opts.quietDays ?? 60;

  const rows = await db.execute<{ month: string; joined: string; lapsed: string }>(sql`
    with months as (
      select to_char(d, 'YYYY-MM') as month, d::date as starts
        from generate_series(
          date_trunc('month', ${opts.from}::date),
          date_trunc('month', ${opts.to}::date),
          interval '1 month'
        ) d
    ),
    seen as (
      select a.person_id,
             min(o.occurs_on) as first_on,
             max(o.occurs_on) as last_on
        from attendance_records a
        join service_occurrences o on o.id = a.occurrence_id
       group by a.person_id
    )
    select m.month,
           (select count(*) from seen s
             where to_char(s.first_on, 'YYYY-MM') = m.month)::text as joined,
           (select count(*) from seen s
             where to_char(s.last_on, 'YYYY-MM') = m.month
               and s.last_on < ${opts.to}::date - ${quiet} * interval '1 day'
               and s.first_on < s.last_on)::text as lapsed
      from months m
     order by m.month`);

  return rows.map((row) => {
    const joined = Number(row.joined);
    const lapsed = Number(row.lapsed);
    return { month: row.month, joined, lapsed, net: joined - lapsed };
  });
}

export interface OpenFollowUp {
  id: string;
  personId: string;
  personSlug: string;
  personName: string;
  /** What the step is: "First visit", "Asked about baptism". */
  title: string;
  /** Who it is waiting on, shortened to a first name and an initial. */
  owner: string | null;
  dueOn: string | null;
}

/**
 * R5.5, R18.1. The few follow-ups the dashboard shows, soonest first.
 *
 * Only what is open, and only enough of it to be answered between two other
 * jobs. The board is where the rest of it lives, and the panel links there.
 */
export async function openFollowUps(db: Tx, limit = 5): Promise<OpenFollowUp[]> {
  const rows = await db.execute<Record<string, string | null>>(sql`
    select f.id,
           f.person_id as "personId",
           p.slug as "personSlug",
           coalesce(nullif(p.preferred_name, ''), p.first_name) || ' ' || p.last_name as "personName",
           f.title,
           case
             when u.id is null then null
             when coalesce(nullif(u.full_name, ''), '') = '' then u.email
             else split_part(u.full_name, ' ', 1)
                  || case when position(' ' in u.full_name) > 0
                       then ' ' || left(split_part(u.full_name, ' ', 2), 1) || '.'
                       else '' end
           end as owner,
           to_char(f.due_on, 'YYYY-MM-DD') as "dueOn"
      from follow_ups f
      join people p on p.id = f.person_id
      left join app_users u on u.id = f.assignee_user_id
     where f.done_at is null
       and p.archived_at is null
     order by f.due_on asc nulls last, f.created_at asc
     limit ${limit}`);

  return rows.map((row) => ({
    id: String(row["id"]),
    personId: String(row["personId"]),
    personSlug: String(row["personSlug"]),
    personName: String(row["personName"]),
    title: String(row["title"]),
    owner: row["owner"] ?? null,
    dueOn: row["dueOn"] ?? null,
  }));
}
