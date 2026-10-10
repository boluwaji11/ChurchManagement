import { sql } from "drizzle-orm";
import type { Tx } from "../client";

/**
 * R18.6. What a church reads back about its groups.
 *
 * Two questions, and most churches only ever ask the first. How many of our
 * members are in a group at all, and which groups are quietly dying.
 *
 * The second is the one worth building. A group stops meeting slowly: the
 * leader misses a week, then a fortnight, then it is March and nobody has said
 * anything, because every gap looked reasonable on its own at the time. A
 * roster of twelve with nobody turning up reads as a healthy group on every
 * screen that counts members rather than attendance.
 *
 * `not_held` is what makes this honest. A leader who records that the group
 * did not meet has told the church something. A leader who recorded nothing
 * has told it something else. Counting those as the same fact is what every
 * other system does, and it is why nobody trusts the number.
 */

/** Who the church counts, which is what belonging is measured against. */
const COUNTED = sql`
  m.archived_at is null
  and m.lifecycle_status in ('regular_attender', 'member')`;

/** A group the church is running, as against one it has finished with. */
const RUNNING = sql`
  g.archived_at is null
  and (g.ends_on is null or g.ends_on >= current_date)`;

export interface GroupParticipation {
  /** Members belonging to at least one running group. */
  inAGroup: number;
  /** Everybody the church counts, which is what that is out of. */
  counted: number;
  /** Percent of them, rounded. */
  rate: number;
  /** Groups the church is running. */
  groups: number;
  /** Of those, how many recorded anything at all across the window. */
  meeting: number;
  /** Of those, how many recorded nothing. */
  silent: number;
  /** Running groups with nobody leading them. */
  leaderless: number;
  /** Average present at a meeting that was held. */
  average: number;
}

/**
 * R18.6. The numbers across the top of the report.
 *
 * "Silent" counts a group that recorded nothing, which is a different fact
 * from a group that recorded a cancellation. A church chasing the silent list
 * is chasing leaders who stopped writing things down, and that is usually the
 * same list as the leaders who stopped meeting.
 */
export async function groupParticipation(
  db: Tx,
  opts: { from: string; to: string },
): Promise<GroupParticipation> {
  const [row] = await db.execute<{
    in_a_group: string; counted: string; groups: string;
    meeting: string; leaderless: string; present: string; held: string;
  }>(sql`
    with counted as (
      select m.id from members m where ${COUNTED}
    ),
    running as (
      select g.id from groups g where ${RUNNING}
    ),
    belonging as (
      select distinct gm.member_id
        from group_memberships gm
        join running r on r.id = gm.group_id
        join counted c on c.id = gm.member_id
       where gm.left_on is null
    ),
    held as (
      select mt.id
        from group_meetings mt
        join running r on r.id = mt.group_id
       where mt.not_held = false
         and mt.met_on between ${opts.from}::date and ${opts.to}::date
    ),
    recorded as (
      select distinct mt.group_id
        from group_meetings mt
        join running r on r.id = mt.group_id
       where mt.met_on between ${opts.from}::date and ${opts.to}::date
    ),
    led as (
      select distinct gm.group_id
        from group_memberships gm
       where gm.left_on is null and gm.role in ('leader', 'coleader')
    )
    select (select count(*) from belonging)::text as in_a_group,
           (select count(*) from counted)::text as counted,
           (select count(*) from running)::text as groups,
           (select count(*) from recorded)::text as meeting,
           (select count(*) from running r
             where not exists (select 1 from led l where l.group_id = r.id))::text as leaderless,
           (select count(*) from group_attendance a
             join held h on h.id = a.meeting_id)::text as present,
           (select count(*) from held)::text as held`);

  const counted = Number(row?.counted ?? 0);
  const inAGroup = Number(row?.in_a_group ?? 0);
  const groups = Number(row?.groups ?? 0);
  const meeting = Number(row?.meeting ?? 0);
  const held = Number(row?.held ?? 0);
  const present = Number(row?.present ?? 0);

  return {
    inAGroup,
    counted,
    rate: counted === 0 ? 0 : Math.round((inAGroup / counted) * 100),
    groups,
    meeting,
    silent: groups - meeting,
    leaderless: Number(row?.leaderless ?? 0),
    average: held === 0 ? 0 : Math.round(present / held),
  };
}

export interface GroupHealthRow {
  id: string;
  slug: string;
  name: string;
  /** What kind of group it is, and the hue that kind carries. */
  type: string | null;
  hue: string;
  /** Live memberships. */
  roster: number;
  leaders: number;
  /** Meetings held across the window. */
  held: number;
  /** Meetings the leader recorded as cancelled. */
  cancelled: number;
  /** Average present at a held meeting. */
  average: number;
  /** What share of the roster turns up, as a percent. */
  turnout: number;
  /** The last day it is recorded as having met. Null where it never has. */
  lastMetOn: string | null;
}

/**
 * R18.6. Group by group, the quietest first.
 *
 * Sorted by when it last met rather than by name, because the report exists to
 * put the groups nobody has heard from at the top. A church reading it
 * alphabetically reads the first four and stops.
 */
export async function groupHealth(
  db: Tx,
  opts: { from: string; to: string },
): Promise<GroupHealthRow[]> {
  const rows = await db.execute<{
    id: string; slug: string; name: string; type: string | null; hue: string | null;
    roster: string; leaders: string; held: string; cancelled: string;
    present: string; last_met_on: string | null;
  }>(sql`
    select g.id, g.slug, g.name,
           t.name as type,
           t.hue as hue,
           (select count(*) from group_memberships gm
             where gm.group_id = g.id and gm.left_on is null)::text as roster,
           (select count(*) from group_memberships gm
             where gm.group_id = g.id and gm.left_on is null
               and gm.role in ('leader', 'coleader'))::text as leaders,
           (select count(*) from group_meetings mt
             where mt.group_id = g.id and mt.not_held = false
               and mt.met_on between ${opts.from}::date and ${opts.to}::date)::text as held,
           (select count(*) from group_meetings mt
             where mt.group_id = g.id and mt.not_held = true
               and mt.met_on between ${opts.from}::date and ${opts.to}::date)::text as cancelled,
           (select count(*) from group_attendance a
             join group_meetings mt on mt.id = a.meeting_id
            where mt.group_id = g.id and mt.not_held = false
              and mt.met_on between ${opts.from}::date and ${opts.to}::date)::text as present,
           (select max(mt.met_on)::text from group_meetings mt
             where mt.group_id = g.id and mt.not_held = false) as last_met_on
      from groups g
      left join group_types t on t.id = g.type_id
     where ${RUNNING}
     order by (select max(mt.met_on) from group_meetings mt
                where mt.group_id = g.id and mt.not_held = false)
                asc nulls first,
              g.name asc`);

  return rows.map((row) => {
    const roster = Number(row.roster);
    const held = Number(row.held);
    const present = Number(row.present);
    const average = held === 0 ? 0 : Math.round(present / held);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      type: row.type,
      hue: row.hue ?? "sky",
      roster,
      leaders: Number(row.leaders),
      held,
      cancelled: Number(row.cancelled),
      average,
      turnout: roster === 0 || held === 0 ? 0 : Math.round((average / roster) * 100),
      lastMetOn: row.last_met_on,
    };
  });
}

export interface GroupTypeShare {
  id: string | null;
  name: string | null;
  hue: string;
  groups: number;
  /** Distinct members belonging to a group of this kind. */
  members: number;
}

/**
 * R18.6. Where the church's members are, by kind of group.
 *
 * Counted distinctly within a kind, so somebody in two life groups counts once
 * against life groups. Across kinds they count twice, which is right: they are
 * in a life group and they are on a course.
 */
export async function groupsByType(db: Tx): Promise<GroupTypeShare[]> {
  const rows = await db.execute<{
    id: string | null; name: string | null; hue: string | null;
    groups: string; members: string;
  }>(sql`
    select t.id, t.name, t.hue,
           count(distinct g.id)::text as groups,
           count(distinct gm.member_id)::text as members
      from groups g
      left join group_types t on t.id = g.type_id
      left join group_memberships gm
        on gm.group_id = g.id and gm.left_on is null
     where ${RUNNING}
     group by t.id, t.name, t.hue, t.position
     order by count(distinct gm.member_id) desc, t.position asc nulls last`);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    hue: row.hue ?? "sky",
    groups: Number(row.groups),
    members: Number(row.members),
  }));
}

export interface GroupMonth {
  month: string;
  /** Meetings held that month. */
  held: number;
  /** Meetings recorded as cancelled. */
  cancelled: number;
  /** Average present at a held meeting. */
  average: number;
}

/**
 * R18.6. Month by month, across every running group.
 *
 * The average rather than the total, because a church that started three
 * groups in February would otherwise read the jump as everybody coming more
 * often.
 */
export async function groupMeetingsByMonth(
  db: Tx,
  opts: { from: string; to: string },
): Promise<GroupMonth[]> {
  const rows = await db.execute<{
    month: string; held: string; cancelled: string; present: string;
  }>(sql`
    with months as (
      select to_char(d, 'YYYY-MM') as month
        from generate_series(
          date_trunc('month', ${opts.from}::date),
          date_trunc('month', ${opts.to}::date),
          interval '1 month'
        ) d
    ),
    meetings as (
      select mt.id, mt.not_held, to_char(mt.met_on, 'YYYY-MM') as month
        from group_meetings mt
        join groups g on g.id = mt.group_id
       where ${RUNNING}
         and mt.met_on between ${opts.from}::date and ${opts.to}::date
    )
    select m.month,
           (select count(*) from meetings x
             where x.month = m.month and x.not_held = false)::text as held,
           (select count(*) from meetings x
             where x.month = m.month and x.not_held = true)::text as cancelled,
           (select count(*) from group_attendance a
             join meetings x on x.id = a.meeting_id
            where x.month = m.month and x.not_held = false)::text as present
      from months m
     order by m.month`);

  return rows.map((row) => {
    const held = Number(row.held);
    return {
      month: row.month,
      held,
      cancelled: Number(row.cancelled),
      average: held === 0 ? 0 : Math.round(Number(row.present) / held),
    };
  });
}
