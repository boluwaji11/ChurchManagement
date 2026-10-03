import { sql } from "drizzle-orm";
import type { Tx } from "../client";

/**
 * R11.12. Who changed what on the plan, and when.
 *
 * Read out of the audit log rather than written alongside it. The log is
 * append-only and written by a trigger, so it already holds every change to
 * every row, and a second history kept by application code is a history that
 * disagrees with the first one the day somebody forgets to write to it.
 *
 * Worship leaders change plans the night before a gathering, and the question
 * on a service morning is which of the eight people with the password did it.
 */

export type PlanChangeAction = "insert" | "update" | "delete";

export interface PlanChange {
  id: string;
  at: string;
  action: PlanChangeAction;
  /** "service_plans", "plan_items", "plan_item_notes" or "plan_item_files". */
  entity: string;
  /** The item's title, the note's first words, the file's label. */
  subject: string | null;
  /** Which fields moved, on an update. Empty for anything else. */
  fields: string[];
  actorName: string | null;
  actorRole: string | null;
}

/**
 * Columns nobody wants to read about.
 *
 * The live mode columns matter most: a gathering of twenty items writes twenty
 * updates to the plan row as it runs, and a history drowned in those is a
 * history nobody scrolls.
 */
const NOISE = new Set([
  "id", "tenant_id", "created_at", "updated_at",
  "live_item_id", "live_started_at", "live_item_at",
]);

/** The first words of a note, for naming it in a list. */
const shorten = (text: string): string =>
  text.length > 60 ? `${text.slice(0, 57)}...` : text;

function subjectOf(entity: string, row: Record<string, unknown> | null): string | null {
  if (!row) return null;
  if (entity === "plan_item_notes") {
    return typeof row.body === "string" ? shorten(row.body) : null;
  }
  if (entity === "plan_item_files") {
    return typeof row.label === "string" ? row.label : null;
  }
  return typeof row.title === "string" ? row.title : null;
}

function movedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): string[] {
  if (!before || !after) return [];
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const name of names) {
    if (NOISE.has(name)) continue;
    if (JSON.stringify(before[name] ?? null) !== JSON.stringify(after[name] ?? null)) {
      out.push(name);
    }
  }
  return out.sort();
}

/**
 * R11.12. The history of one plan, newest first.
 *
 * An update where nothing but the noise moved is dropped, so running a
 * gathering in live mode leaves no trail here.
 */
export async function planHistory(
  db: Tx,
  planId: string,
  limit = 50,
): Promise<PlanChange[]> {
  const rows = await db.execute<{
    id: string;
    at: Date;
    action: string;
    entity: string;
    actor_name: string | null;
    actor_role: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  }>(sql`
    with plan_item_ids as (
      select distinct coalesce(a.after ->> 'id', a.before ->> 'id') as id
        from audit_entries a
       where a.entity = 'plan_items'
         and coalesce(a.after ->> 'plan_id', a.before ->> 'plan_id') = ${planId}
    )
    select a.id,
           a.at,
           a.action::text as action,
           a.entity,
           u.full_name as actor_name,
           a.actor_role,
           a.before,
           a.after
      from audit_entries a
      left join app_users u on u.id = a.actor_user_id
     where (a.entity = 'service_plans' and a.entity_id = ${planId}::uuid)
        or (a.entity = 'plan_items'
            and coalesce(a.after ->> 'plan_id', a.before ->> 'plan_id') = ${planId})
        or (a.entity in ('plan_item_notes', 'plan_item_files')
            and coalesce(a.after ->> 'item_id', a.before ->> 'item_id')
                in (select id from plan_item_ids))
     order by a.at desc
     limit ${limit * 4}
  `);

  const out: PlanChange[] = [];
  for (const row of rows) {
    const action = row.action as PlanChangeAction;
    const fields = action === "update" ? movedFields(row.before, row.after) : [];
    if (action === "update" && fields.length === 0) continue;

    out.push({
      id: row.id,
      at: new Date(row.at).toISOString(),
      action,
      entity: row.entity,
      subject: subjectOf(row.entity, row.after ?? row.before),
      fields,
      actorName: row.actor_name,
      actorRole: row.actor_role,
    });
    if (out.length >= limit) break;
  }

  return out;
}
