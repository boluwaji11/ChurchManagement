import { sql } from "drizzle-orm";
import type { Tx } from "../client";
import { canReadConfidentialNotes, canArchivePeople, PermissionError, type TenantRole } from "../roles";
import { decryptNote } from "../crypto";
import { toCsv } from "./csv";

/**
 * R19.8. A complete export of everything, one click, always available.
 *
 * This is not a feature, it is the trust mechanism. The whole free-forever
 * argument rests on a church being able to leave whenever they want, and a
 * promise they cannot test is not worth anything. So: no plan gate, no support
 * ticket, no delay, and open formats a spreadsheet can open.
 *
 * Written so that what comes out could be read back in. Every table carries its
 * own ids, so the relationships survive the round trip rather than being flattened
 * into something only a human can interpret.
 */

/** Every table that holds this church's data. Order is the order it is written. */
const TABLES = [
  "tenants",
  "campuses",
  "locations",
  "rooms",
  "service_times",
  "service_occurrences",
  "attendance_records",
  "checkin_rooms",
  "checkin_stations",
  "checkin_station_rooms",
  "checkin_station_services",
  "checkin_visits",
  "checkin_overrides",
  "checkin_codes",
  "checkin_offline_events",
  "incident_reports",
  "group_types",
  "groups",
  "group_memberships",
  "group_meetings",
  "group_attendance",
  "group_join_requests",
  "pipelines",
  "pipeline_steps",
  "pipeline_entries",
  "follow_ups",
  "directory_preferences",
  "saved_lists",
  "saved_list_members",
  "teams",
  "team_positions",
  "team_members",
  "team_member_positions",
  "serving_assignments",
  "blockout_dates",
  "serving_preferences",
  "service_plans",
  "plan_items",
  "plan_item_notes",
  "plan_item_files",
  "plan_templates",
  "plan_template_items",
  "forms",
  "form_fields",
  "form_submissions",
  "stored_files",
  "demo_records",
  "tenant_members",
  "invitations",
  "households",
  "members",
  "household_memberships",
  "contact_methods",
  "addresses",
  "relationships",
  "milestones",
  "background_checks",
  "tags",
  "member_tags",
  "custom_fields",
  "custom_field_values",
  "notes",
  "import_batches",
  "import_rows",
  "person_merges",
  "tenant_roles",
  "notifications",
  "audit_entries",
] as const;

export type ExportTable = (typeof TABLES)[number];

export interface Archive {
  /** The whole thing, as one object. Keyed by table. */
  data: Record<string, Record<string, unknown>[]>;
  /** One CSV per table, ready to write into a zip. */
  csv: Record<string, string>;
  meta: {
    exportedAt: string;
    church: string;
    format: number;
    counts: Record<string, number>;
    /** Named so a reader knows the export is complete but a field was withheld. */
    withheld: string[];
  };
}

/** The archive format version, so a future importer knows what it is reading. */
export const ARCHIVE_FORMAT = 1;

/**
 * Builds the whole archive.
 *
 * Held in memory, deliberately, for now. The target is churches of 50 to 500
 * members, where this is a few megabytes. Streaming it row by row is the right
 * answer at ten thousand and is a different piece of work; doing it now would be
 * complexity bought against a problem nobody has. HRT-39 covers it.
 */
export async function buildArchive(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  church: { name: string; slug: string },
): Promise<Archive> {
  // Exporting hands over every record the church holds in one file. That is the
  // point, and it is also why it is not something any role can do unprompted.
  if (!canArchivePeople(actor.role)) throw new PermissionError(actor.role, "exportEverything");

  const data: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};
  const withheld: string[] = [];

  for (const table of TABLES) {
    // No tenant predicate. Row-level security supplies it, so a table added
    // later is scoped by the policy rather than by remembering to filter here.
    const rows = (await db.execute(
      sql`select * from ${sql.identifier(table)}`,
    )) as unknown as Record<string, unknown>[];

    const cleaned = rows.map((row) => clean(table, row, actor.role, withheld));
    data[table] = cleaned;
    counts[table] = cleaned.length;
  }

  const csv: Record<string, string> = {};
  for (const [table, rows] of Object.entries(data)) csv[table] = toCsv(rows);

  return {
    data,
    csv,
    meta: {
      exportedAt: new Date().toISOString(),
      church: church.name,
      format: ARCHIVE_FORMAT,
      counts,
      withheld: [...new Set(withheld)],
    },
  };
}

/**
 * Field-level permissions apply to an export exactly as they apply to a screen
 * (R1.5, R21.2). An export is the easiest place in any product to leak a
 * restricted field, because it is one query and nobody is looking at the output.
 *
 * A confidential note is decrypted for a role that may read it, because it is
 * the church's own data and ciphertext they cannot open is not an export. For
 * every other role the body is absent, and the withholding is declared in the
 * archive's metadata rather than left to be noticed.
 */
function clean(
  table: string,
  row: Record<string, unknown>,
  role: TenantRole,
  withheld: string[],
): Record<string, unknown> {
  if (table !== "notes") return row;

  const out = { ...row };
  const encrypted = out["body_encrypted"];
  delete out["body_encrypted"];

  if (out["classification"] !== "confidential") return out;

  if (canReadConfidentialNotes(role)) {
    out["body"] = typeof encrypted === "string" ? decryptNote(encrypted) : out["body"];
    return out;
  }

  delete out["body"];
  out["restricted"] = true;
  withheld.push("notes.body");
  return out;
}

export { TABLES as EXPORT_TABLES };
