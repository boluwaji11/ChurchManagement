import { sql } from "drizzle-orm";
import type { Tx } from "../client";

/**
 * R18.7. What a church reads back about the people who serve.
 *
 * Three questions, and the third is the one with a deadline on it.
 *
 * Who is carrying too much. Which positions go unfilled. And whose background
 * check runs out before the service they are already scheduled for, which is
 * the only report in this product where being a week late has a safeguarding
 * consequence rather than an administrative one.
 */

/** A position that is a children's position, by either of the two ways it can be. */
const CHILDRENS = sql`(p.with_children = true or p.requires_check = true)`;

export interface ServingCoverage {
  /** Positions asked for across the window. */
  asked: number;
  /** Of those, how many have somebody down for them. */
  filled: number;
  /** Percent, rounded. */
  rate: number;
  /** Assignments nobody has answered yet. */
  waiting: number;
  /** Assignments somebody said no to and nobody has replaced. */
  declined: number;
  /** Distinct people who served at least once. */
  volunteers: number;
}

/**
 * R18.7. Whether the rota is actually covered.
 *
 * Counted against positions asked for rather than against positions that
 * exist, because a team with nine positions that only runs two of them on a
 * given service day is not eight-ninths short.
 */
export async function servingCoverage(
  db: Tx,
  opts: { from: string; to: string },
): Promise<ServingCoverage> {
  const [row] = await db.execute<{
    asked: string; filled: string; waiting: string; declined: string; volunteers: string;
  }>(sql`
    with window_assignments as (
      select a.*
        from serving_assignments a
        join service_occurrences o on o.id = a.occurrence_id
       where o.occurs_on between ${opts.from}::date and ${opts.to}::date
    )
    select (select count(*) from window_assignments)::text as asked,
           (select count(*) from window_assignments where status = 'accepted')::text as filled,
           (select count(*) from window_assignments where status = 'pending')::text as waiting,
           (select count(*) from window_assignments where status = 'declined')::text as declined,
           (select count(distinct member_id) from window_assignments
             where status <> 'declined')::text as volunteers`);

  const asked = Number(row?.asked ?? 0);
  const filled = Number(row?.filled ?? 0);

  return {
    asked,
    filled,
    rate: asked === 0 ? 0 : Math.round((filled / asked) * 100),
    waiting: Number(row?.waiting ?? 0),
    declined: Number(row?.declined ?? 0),
    volunteers: Number(row?.volunteers ?? 0),
  };
}

export interface TeamCoverage {
  id: string;
  name: string;
  hue: string;
  asked: number;
  filled: number;
  declined: number;
  rate: number;
}

/** R18.7. The same question team by team, worst covered first. */
export async function coverageByTeam(
  db: Tx,
  opts: { from: string; to: string },
): Promise<TeamCoverage[]> {
  const rows = await db.execute<{
    id: string; name: string; hue: string | null;
    asked: string; filled: string; declined: string;
  }>(sql`
    select t.id, t.name, t.hue,
           count(a.id)::text as asked,
           count(a.id) filter (where a.status = 'accepted')::text as filled,
           count(a.id) filter (where a.status = 'declined')::text as declined
      from teams t
      join serving_assignments a on a.team_id = t.id
      join service_occurrences o on o.id = a.occurrence_id
     where o.occurs_on between ${opts.from}::date and ${opts.to}::date
     group by t.id, t.name, t.hue
     order by (count(a.id) filter (where a.status = 'accepted'))::numeric
              / nullif(count(a.id), 0) asc nulls first,
              t.name asc`);

  return rows.map((row) => {
    const asked = Number(row.asked);
    const filled = Number(row.filled);
    return {
      id: row.id,
      name: row.name,
      hue: row.hue ?? "teal",
      asked,
      filled,
      declined: Number(row.declined),
      rate: asked === 0 ? 0 : Math.round((filled / asked) * 100),
    };
  });
}

export interface ServingLoad {
  memberId: string;
  slug: string;
  name: string;
  /** Times they served across the window. */
  served: number;
  /** Times they were asked and said no. */
  declined: number;
  /** The last service day they served. */
  lastServedOn: string | null;
  /** Roughly how often, as one service in every N held. */
  everyNth: number | null;
}

/**
 * R18.7. Who is carrying how much, the heaviest first.
 *
 * The number a church acts on is at the top of this list rather than the
 * bottom. A volunteer down for three services in four is a volunteer about to
 * stop, and nobody notices because each individual ask was reasonable.
 */
export async function servingLoad(
  db: Tx,
  opts: { from: string; to: string; limit?: number },
): Promise<ServingLoad[]> {
  const limit = opts.limit ?? 50;

  const rows = await db.execute<{
    member_id: string; slug: string; name: string;
    served: string; declined: string; last_served_on: string | null; held: string;
  }>(sql`
    with held as (
      select count(*)::numeric as n
        from service_occurrences o
       where o.occurs_on between ${opts.from}::date and ${opts.to}::date
    )
    select a.member_id,
           m.slug,
           trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) as name,
           count(*) filter (where a.status = 'accepted')::text as served,
           count(*) filter (where a.status = 'declined')::text as declined,
           max(o.occurs_on) filter (where a.status = 'accepted')::text as last_served_on,
           (select n from held)::text as held
      from serving_assignments a
      join service_occurrences o on o.id = a.occurrence_id
      join members m on m.id = a.member_id
     where o.occurs_on between ${opts.from}::date and ${opts.to}::date
     group by a.member_id, m.slug, m.first_name, m.last_name
     order by count(*) filter (where a.status = 'accepted') desc,
              name asc
     limit ${limit}`);

  return rows.map((row) => {
    const served = Number(row.served);
    const held = Number(row.held);
    return {
      memberId: row.member_id,
      slug: row.slug,
      name: row.name,
      served,
      declined: Number(row.declined),
      lastServedOn: row.last_served_on,
      everyNth: served === 0 || held === 0 ? null : Math.max(1, Math.round(held / served)),
    };
  });
}

export interface ExpiringCheck {
  memberId: string;
  slug: string;
  name: string;
  status: string;
  expiresOn: string | null;
  /** Days from today. Negative where it has already run out. */
  daysLeft: number | null;
  /** Whether they are down for a children's position that is still ahead. */
  scheduledWithChildren: boolean;
}

/**
 * R18.7, R10.9. Whose check runs out, soonest first, and who is already down
 * to work with children after it does.
 *
 * The last column is the point. A check that expired in March matters when
 * somebody is on the rota for a children's room in April, and the church has
 * no other way to notice that pairing.
 *
 * The hard gate that refuses the assignment is R10.9, in the children's
 * ministry pass. This is the list a church works before it gets there.
 */
export async function expiringChecks(
  db: Tx,
  opts: { within: number; today: string },
): Promise<ExpiringCheck[]> {
  const rows = await db.execute<{
    member_id: string; slug: string; name: string; status: string;
    expires_on: string | null; days_left: string | null; scheduled: boolean;
  }>(sql`
    with latest as (
      select distinct on (c.member_id)
             c.member_id, c.status, c.expires_on
        from background_checks c
       order by c.member_id, c.completed_on desc nulls last, c.created_at desc
    )
    select l.member_id,
           m.slug,
           trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, '')) as name,
           l.status::text as status,
           l.expires_on::text as expires_on,
           (l.expires_on - ${opts.today}::date)::text as days_left,
           exists (
             select 1
               from serving_assignments a
               join team_positions p on p.id = a.position_id
               join service_occurrences o on o.id = a.occurrence_id
              where a.member_id = l.member_id
                and a.status <> 'declined'
                and o.occurs_on >= ${opts.today}::date
                and ${CHILDRENS}
           ) as scheduled
      from latest l
      join members m on m.id = l.member_id
     where m.archived_at is null
       and l.expires_on is not null
       and l.expires_on <= ${opts.today}::date + ${opts.within} * interval '1 day'
     order by l.expires_on asc, name asc`);

  return rows.map((row) => ({
    memberId: row.member_id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    expiresOn: row.expires_on,
    daysLeft: row.days_left === null ? null : Number(row.days_left),
    scheduledWithChildren: row.scheduled,
  }));
}
