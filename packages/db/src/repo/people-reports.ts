import { sql } from "drizzle-orm";
import type { Tx } from "../client";

/**
 * R18.8, R18.9. The lists a church reads about its own people.
 *
 * Milestones and new members, and the four-part signal of whether somebody is
 * actually connected to the church or only on its roll.
 */

/** Who the church counts, which is the denominator for everything here. */
const COUNTED = sql`
  m.archived_at is null
  and m.lifecycle_status in ('regular_attender', 'member')`;

export interface MilestoneCount {
  kind: string;
  count: number;
}

/** R18.8. How many of each milestone fell inside the window. */
export async function milestoneCounts(
  db: Tx,
  opts: { from: string; to: string },
): Promise<MilestoneCount[]> {
  const rows = await db.execute<{ kind: string; n: string }>(sql`
    select s.kind::text as kind, count(*)::text as n
      from milestones s
      join members m on m.id = s.member_id
     where m.archived_at is null
       and s.occurred_on between ${opts.from}::date and ${opts.to}::date
     group by s.kind
     order by count(*) desc, s.kind asc`);

  return rows.map((row) => ({ kind: row.kind, count: Number(row.n) }));
}

export interface MilestoneRow {
  id: string;
  memberId: string;
  slug: string;
  name: string;
  kind: string;
  occurredOn: string;
}

/** R18.8. The milestones themselves, most recent first. */
export async function milestoneList(
  db: Tx,
  opts: { from: string; to: string; kind?: string; limit?: number },
): Promise<MilestoneRow[]> {
  const limit = opts.limit ?? 500;
  const kind = opts.kind ?? null;

  const rows = await db.execute<{
    id: string; member_id: string; slug: string; name: string;
    kind: string; occurred_on: string;
  }>(sql`
    select s.id, s.member_id, m.slug,
           trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) as name,
           s.kind::text as kind,
           s.occurred_on::text as occurred_on
      from milestones s
      join members m on m.id = s.member_id
     where m.archived_at is null
       and s.occurred_on between ${opts.from}::date and ${opts.to}::date
       and (${kind}::text is null or s.kind::text = ${kind}::text)
     order by s.occurred_on desc, name asc
     limit ${limit}`);

  return rows.map((row) => ({
    id: row.id,
    memberId: row.member_id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    occurredOn: row.occurred_on,
  }));
}

export interface NewMemberRow {
  memberId: string;
  slug: string;
  name: string;
  membershipDate: string;
  /** When they first turned up, where the church recorded it. */
  firstVisitOn: string | null;
  /** How long from first visit to membership, in days. */
  daysToJoin: number | null;
}

/**
 * R18.8. Who joined across the window.
 *
 * The last column is the one worth having. A church that takes eleven months
 * to turn a first visit into a membership has a different problem from one
 * that takes six weeks, and neither of them knows which they are.
 */
export async function newMembers(
  db: Tx,
  opts: { from: string; to: string; limit?: number },
): Promise<NewMemberRow[]> {
  const rows = await db.execute<{
    member_id: string; slug: string; name: string;
    membership_date: string; first_visit_on: string | null; days: string | null;
  }>(sql`
    select m.id as member_id, m.slug,
           trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) as name,
           m.membership_date::text as membership_date,
           m.first_visit_on::text as first_visit_on,
           (m.membership_date - m.first_visit_on)::text as days
      from members m
     where m.archived_at is null
       and m.membership_date is not null
       and m.membership_date between ${opts.from}::date and ${opts.to}::date
     order by m.membership_date desc, name asc
     limit ${opts.limit ?? 500}`);

  return rows.map((row) => ({
    memberId: row.member_id,
    slug: row.slug,
    name: row.name,
    membershipDate: row.membership_date,
    firstVisitOn: row.first_visit_on,
    daysToJoin: row.days === null ? null : Number(row.days),
  }));
}

/**
 * R18.9. The connectedness indicator.
 *
 * Four booleans and a count. Does this person turn up, give, serve, and belong
 * to a group. Nothing is weighted, nothing is scored, and no model is
 * involved, because the whole value of it is that a pastor can explain it to
 * the person it describes.
 *
 * Giving is counted as a yes or a no and never as an amount, so the indicator
 * is readable by a role that may not see what anybody gave.
 */
export interface Connectedness {
  memberId: string;
  slug: string;
  name: string;
  attends: boolean;
  gives: boolean;
  serves: boolean;
  inGroup: boolean;
  /** Nought to four. */
  score: number;
}

export interface ConnectednessSummary {
  counted: number;
  /** How many people sit at each score, indexed nought to four. */
  bands: number[];
  attends: number;
  gives: number;
  serves: number;
  inGroup: number;
}

/** The four parts, as one query, for whoever is counted. */
const PARTS = (from: string, to: string) => sql`
  select m.id as member_id, m.slug,
         trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) as name,
         exists (
           select 1 from attendance_records a
             join service_occurrences o on o.id = a.occurrence_id
            where a.member_id = m.id
              and o.occurs_on between ${from}::date and ${to}::date
         ) as attends,
         exists (
           select 1 from gifts g
            where g.member_id = m.id
              and g.received_on between ${from}::date and ${to}::date
         ) as gives,
         exists (
           select 1 from serving_assignments s
             join service_occurrences o2 on o2.id = s.occurrence_id
            where s.member_id = m.id
              and s.status = 'accepted'
              and o2.occurs_on between ${from}::date and ${to}::date
         ) as serves,
         exists (
           select 1 from group_memberships gm
             join groups g2 on g2.id = gm.group_id
            where gm.member_id = m.id
              and gm.left_on is null
              and g2.archived_at is null
         ) as in_group
    from members m
   where ${COUNTED}`;

/** R18.9. Everybody's four parts, least connected first. */
export async function connectedness(
  db: Tx,
  opts: { from: string; to: string; score?: number; limit?: number },
): Promise<Connectedness[]> {
  const want = opts.score ?? null;

  const rows = await db.execute<{
    member_id: string; slug: string; name: string;
    attends: boolean; gives: boolean; serves: boolean; in_group: boolean;
  }>(sql`
    with parts as (${PARTS(opts.from, opts.to)})
    select * from parts
     where (${want}::int is null
            or (attends::int + gives::int + serves::int + in_group::int) = ${want}::int)
     order by (attends::int + gives::int + serves::int + in_group::int) asc, name asc
     limit ${opts.limit ?? 500}`);

  return rows.map((row) => {
    const parts = [row.attends, row.gives, row.serves, row.in_group];
    return {
      memberId: row.member_id,
      slug: row.slug,
      name: row.name,
      attends: row.attends,
      gives: row.gives,
      serves: row.serves,
      inGroup: row.in_group,
      score: parts.filter(Boolean).length,
    };
  });
}

/** R18.9. The shape of the congregation, by how many parts each person has. */
export async function connectednessSummary(
  db: Tx,
  opts: { from: string; to: string },
): Promise<ConnectednessSummary> {
  const [row] = await db.execute<{
    counted: string; attends: string; gives: string; serves: string; in_group: string;
    b0: string; b1: string; b2: string; b3: string; b4: string;
  }>(sql`
    with parts as (${PARTS(opts.from, opts.to)}),
    scored as (
      select *, (attends::int + gives::int + serves::int + in_group::int) as score
        from parts
    )
    select count(*)::text as counted,
           count(*) filter (where attends)::text as attends,
           count(*) filter (where gives)::text as gives,
           count(*) filter (where serves)::text as serves,
           count(*) filter (where in_group)::text as in_group,
           count(*) filter (where score = 0)::text as b0,
           count(*) filter (where score = 1)::text as b1,
           count(*) filter (where score = 2)::text as b2,
           count(*) filter (where score = 3)::text as b3,
           count(*) filter (where score = 4)::text as b4
      from scored`);

  return {
    counted: Number(row?.counted ?? 0),
    bands: [
      Number(row?.b0 ?? 0), Number(row?.b1 ?? 0), Number(row?.b2 ?? 0),
      Number(row?.b3 ?? 0), Number(row?.b4 ?? 0),
    ],
    attends: Number(row?.attends ?? 0),
    gives: Number(row?.gives ?? 0),
    serves: Number(row?.serves ?? 0),
    inGroup: Number(row?.in_group ?? 0),
  };
}
