import { sql } from "drizzle-orm";
import type { Tx } from "../client";
import { canArchivePeople, PermissionError, type TenantRole } from "../roles";
import { toCsv } from "./csv";

/**
 * R19.8. The files a church downloads one at a time.
 *
 * Separate from the archive on purpose. The archive is written so it could be
 * read back in, so it carries raw tables and raw ids and nothing is joined. A
 * church downloading one file is going to open it in a spreadsheet, so these
 * carry names where the archive carries ids, and one row means one thing a
 * person would recognise: somebody, a family member, a time they were here.
 *
 * Every query runs under the tenant's own transaction, so row-level security
 * supplies the church. Nothing here filters by tenant_id itself.
 */
export interface ExportView {
  /** What the URL asks for, and what the file is called. */
  key: string;
  /** Written out so the order of the columns is ours rather than Postgres's. */
  columns: string[];
  query: ReturnType<typeof sql>;
}

const VIEWS: ExportView[] = [
  {
    key: "members",
    columns: [
      "name", "first_name", "last_name", "preferred_name", "status", "household", "household_role",
      "email", "phone", "address", "date_of_birth", "gender", "marital_status",
      "member_since", "first_visit", "campus", "tags", "custom_fields", "archived",
    ],
    query: sql`
      select btrim(coalesce(p.preferred_name, p.first_name) || ' ' || coalesce(p.last_name, '')) as name,
             p.first_name, p.last_name, p.preferred_name,
             p.lifecycle_status as status,
             h.name as household,
             hm.role::text as household_role,
             (select value from contact_methods c
               where c.member_id = p.id and c.kind = 'email'
               order by c.is_primary desc limit 1) as email,
             (select value from contact_methods c
               where c.member_id = p.id and c.kind = 'phone'
               order by c.is_primary desc limit 1) as phone,
             (select concat_ws(', ', nullif(a.line1, ''), nullif(a.line2, ''), nullif(a.city, ''),
                                     nullif(a.region, ''), nullif(a.postal_code, ''))
                from addresses a
               where a.member_id = p.id or a.household_id = hm.household_id
               order by (a.member_id = p.id) desc, a.is_primary desc limit 1) as address,
             p.date_of_birth, p.gender, p.marital_status,
             p.membership_date as member_since,
             p.first_visit_on as first_visit,
             cam.name as campus,
             (select string_agg(t.name, ', ' order by t.name)
                from member_tags pt join tags t on t.id = pt.tag_id
               where pt.member_id = p.id) as tags,
             (select string_agg(f.label || ': ' || v.value, '; ' order by f.label)
                from custom_field_values v join custom_fields f on f.id = v.field_id
               where v.entity_id = p.id and f.entity = 'person') as custom_fields,
             case when p.archived_at is null then 'no' else 'yes' end as archived
        from members p
        left join household_memberships hm on hm.member_id = p.id and hm.ended_on is null
        left join households h on h.id = hm.household_id
        left join campuses cam on cam.id = p.campus_id
       order by p.last_name, p.first_name`,
  },

  {
    key: "households",
    columns: ["household", "person", "role", "email", "phone", "address", "joined", "archived"],
    query: sql`
      select h.name as household,
             btrim(coalesce(p.preferred_name, p.first_name) || ' ' || coalesce(p.last_name, '')) as person,
             hm.role::text as role,
             (select value from contact_methods c
               where c.member_id = p.id and c.kind = 'email'
               order by c.is_primary desc limit 1) as email,
             (select value from contact_methods c
               where c.member_id = p.id and c.kind = 'phone'
               order by c.is_primary desc limit 1) as phone,
             (select concat_ws(', ', nullif(a.line1, ''), nullif(a.city, ''),
                                     nullif(a.region, ''), nullif(a.postal_code, ''))
                from addresses a where a.household_id = h.id
               order by a.is_primary desc limit 1) as address,
             hm.started_on as joined,
             case when h.archived_at is null then 'no' else 'yes' end as archived
        from households h
        left join household_memberships hm on hm.household_id = h.id and hm.ended_on is null
        left join members p on p.id = hm.member_id
       order by h.name, hm.role, p.last_name`,
  },

  {
    key: "attendance",
    columns: ["date", "kind", "what", "person", "how"],
    query: sql`
      select o.occurs_on as date, 'Service' as kind,
             coalesce(o.name, st.name) as what,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             ar.source::text as how
        from attendance_records ar
        join service_occurrences o on o.id = ar.occurrence_id
        left join service_times st on st.id = o.service_time_id
        join members pe on pe.id = ar.member_id
      union all
      select m.met_on as date, 'Group' as kind, g.name as what,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             'group' as how
        from group_attendance ga
        join group_meetings m on m.id = ga.meeting_id
        join groups g on g.id = m.group_id
        join members pe on pe.id = ga.member_id
      union all
      select o.occurs_on as date, 'Check-in' as kind, r.name as what,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             v.kind::text as how
        from checkin_visits v
        join service_occurrences o on o.id = v.occurrence_id
        left join checkin_rooms r on r.id = v.room_id
        join members pe on pe.id = v.member_id
       order by 1 desc, 4`,
  },

  {
    key: "checkin",
    columns: ["date", "service", "person", "room", "code", "checked_in", "checked_out", "collected_by"],
    query: sql`
      select o.occurs_on as date,
             coalesce(o.name, st.name) as service,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             r.name as room,
             v.code,
             v.checked_in_at as checked_in,
             v.checked_out_at as checked_out,
             (select btrim(coalesce(g.preferred_name, g.first_name) || ' ' || coalesce(g.last_name, ''))
                from members g where g.id = v.checked_out_to) as collected_by
        from checkin_visits v
        join service_occurrences o on o.id = v.occurrence_id
        left join service_times st on st.id = o.service_time_id
        join members pe on pe.id = v.member_id
        left join checkin_rooms r on r.id = v.room_id
       order by o.occurs_on desc, pe.last_name`,
  },

  {
    key: "groups",
    columns: ["group", "type", "meets", "where", "person", "role", "joined"],
    query: sql`
      select g.name as "group",
             gt.name as type,
             g.frequency::text as meets,
             coalesce(nullif(g.location, ''), case when g.online then 'Online' else null end) as "where",
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             gm.role::text as role,
             gm.joined_on as joined
        from groups g
        left join group_types gt on gt.id = g.type_id
        left join group_memberships gm on gm.group_id = g.id and gm.left_on is null
        left join members pe on pe.id = gm.member_id
       order by g.name, gm.role, pe.last_name`,
  },

  {
    key: "teams",
    columns: ["team", "person", "role", "positions", "joined"],
    query: sql`
      select t.name as team,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             tm.role::text as role,
             (select string_agg(tp.name, ', ' order by tp.position)
                from team_member_positions tmp
                join team_positions tp on tp.id = tmp.position_id
               where tmp.member_id = tm.id) as positions,
             tm.joined_on as joined
        from teams t
        left join team_members tm on tm.team_id = t.id and tm.left_on is null
        left join members pe on pe.id = tm.member_id
       order by t.name, pe.last_name`,
  },

  {
    key: "serving",
    columns: ["date", "service", "team", "position", "person", "answer"],
    query: sql`
      select o.occurs_on as date,
             coalesce(o.name, st.name) as service,
             t.name as team,
             tp.name as position,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             sa.status::text as answer
        from serving_assignments sa
        join service_occurrences o on o.id = sa.occurrence_id
        left join service_times st on st.id = o.service_time_id
        join teams t on t.id = sa.team_id
        left join team_positions tp on tp.id = sa.position_id
        join members pe on pe.id = sa.member_id
       order by o.occurs_on desc, t.name, tp.position`,
  },

  {
    key: "followups",
    columns: ["stage", "person", "step", "due", "done", "outcome", "entered", "status"],
    query: sql`
      select pl.name as stage,
             btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             f.title as step,
             f.due_on as due,
             f.done_at as done,
             f.outcome,
             en.started_on as entered,
             en.status::text as status
        from follow_ups f
        join pipeline_entries en on en.id = f.entry_id
        join pipelines pl on pl.id = en.pipeline_id
        join members pe on pe.id = f.member_id
       order by en.started_on desc, pl.name, f.position`,
  },

  {
    key: "milestones",
    columns: ["person", "milestone", "date", "notes"],
    query: sql`
      select btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             m.kind::text as milestone,
             m.occurred_on as date,
             m.notes
        from milestones m
        join members pe on pe.id = m.member_id
       order by m.occurred_on desc, pe.last_name`,
  },

  {
    key: "checks",
    columns: ["person", "provider", "status", "completed", "expires"],
    query: sql`
      select btrim(coalesce(pe.preferred_name, pe.first_name) || ' ' || coalesce(pe.last_name, '')) as person,
             b.provider, b.status::text as status,
             b.completed_on as completed,
             b.expires_on as expires
        from background_checks b
        join members pe on pe.id = b.member_id
       order by b.expires_on nulls last, pe.last_name`,
  },

  {
    key: "forms",
    columns: ["form", "submitted", "answers"],
    query: sql`
      select fo.name as form,
             s.created_at as submitted,
             (select string_agg(ff.label || ': ' || coalesce(s.answers ->> ff.id::text, ''), '; '
                                order by ff.position)
                from form_fields ff where ff.form_id = fo.id) as answers
        from form_submissions s
        join forms fo on fo.id = s.form_id
       order by s.created_at desc`,
  },
];

/** The keys a church can ask for, in the order the screen lists them. */
export const EXPORT_VIEWS: readonly string[] = VIEWS.map((one) => one.key);

/**
 * R19.8. One file, joined and named, for a church opening it in a spreadsheet.
 *
 * Gated like the archive: handing over every contact detail the church holds is
 * the same act whether it arrives as a zip or as one sheet.
 */
export async function buildView(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  key: string,
): Promise<string | null> {
  if (!canArchivePeople(actor.role)) throw new PermissionError(actor.role, "exportEverything");

  const view = VIEWS.find((one) => one.key === key);
  if (!view) return null;

  const rows = (await db.execute(view.query)) as unknown as Record<string, unknown>[];
  return toCsv(rows, view.columns);
}
