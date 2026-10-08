import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import type { Permission } from "../permissions";
import { savedReports } from "../schema/reports";
import { InvalidInputError, NameTakenError } from "../errors";
import { PermissionError, canEditPeople, type TenantRole } from "../roles";
import { canReadIncidents } from "./incidents";
import { cleanPage, type ReportPage } from "./report-spec";

/**
 * R18.x. Reports a church built for itself.
 *
 * Who may read a report may build one. Reports are already behind a staff role,
 * and a church where one person can read a list but may not keep the list she
 * reads every Monday has learned nothing except to use the export button.
 */

export interface SavedReport {
  id: string;
  name: string;
  slug: string;
  subject: string;
  spec: ReportPage;
  createdByUserId: string | null;
  archivedAt: Date | null;
  updatedAt: Date;
}

interface Actor {
  tenantId: string;
  role: TenantRole;
  userId?: string | null;
  permissions?: readonly Permission[] | null;
}

const mayRead = (actor: Actor) => canEditPeople(actor) || canReadIncidents(actor);

const clean = (name: string): string => name.trim().replace(/\s+/g, " ");

const shape = (row: typeof savedReports.$inferSelect): SavedReport => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  subject: row.subject,
  // Read back through the catalogue, so a field that has since been taken out
  // cannot come back through a row saved last year.
  spec: cleanPage(row.spec),
  createdByUserId: row.createdByUserId,
  archivedAt: row.archivedAt,
  updatedAt: row.updatedAt,
});

export async function listSavedReports(
  db: Tx,
  opts: { includeArchived?: boolean; archivedOnly?: boolean } = {},
): Promise<SavedReport[]> {
  const rows = await db
    .select()
    .from(savedReports)
    .where(
      opts.archivedOnly
        ? sql`${savedReports.archivedAt} is not null`
        : opts.includeArchived
          ? undefined
          : isNull(savedReports.archivedAt),
    )
    .orderBy(asc(savedReports.name));
  return rows.map(shape);
}

/** R18.x, R24.6. How many a church has put away, for the link that reaches them. */
export async function countArchivedSavedReports(db: Tx): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(savedReports)
    .where(sql`${savedReports.archivedAt} is not null`);
  return row?.count ?? 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** R24.6. By its readable address, or by its id where that is what was given. */
export async function getSavedReport(db: Tx, key: string): Promise<SavedReport | null> {
  const [row] = await db
    .select()
    .from(savedReports)
    .where(UUID.test(key) ? eq(savedReports.id, key) : eq(savedReports.slug, key))
    .limit(1);
  return row ? shape(row) : null;
}

export async function createSavedReport(
  db: Tx,
  actor: Actor,
  input: { name: string; spec: unknown },
): Promise<SavedReport> {
  if (!mayRead(actor)) throw new PermissionError(actor.role, "buildReports");

  const name = clean(input.name);
  if (!name) throw new InvalidInputError("report.error.name");
  const spec = cleanPage(input.spec);

  try {
    const [row] = await db
      .insert(savedReports)
      .values({
        tenantId: actor.tenantId,
        name,
        slug: sql`hearth_free_report_slug(${actor.tenantId}::uuid, ${name})`,
        subject: spec.tiles[0]?.subject ?? "members",
        spec,
        createdByUserId: actor.userId ?? null,
      })
      .returning();
    return shape(row!);
  } catch (error) {
    if (String((error as { message?: string }).message ?? "").includes("saved_reports_name_unique")) {
      throw new NameTakenError("report.error.nameTaken", name, "");
    }
    throw error;
  }
}

/** R18.x. Changing one that is already saved, name and all. */
export async function updateSavedReport(
  db: Tx,
  actor: Actor,
  input: { id: string; name?: string; spec?: unknown },
): Promise<void> {
  if (!mayRead(actor)) throw new PermissionError(actor.role, "buildReports");

  const patch: Partial<typeof savedReports.$inferInsert> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const name = clean(input.name);
    if (!name) throw new InvalidInputError("report.error.name");
    patch.name = name;
    patch.slug = sql`hearth_free_report_slug(${actor.tenantId}::uuid, ${name}, ${input.id}::uuid)` as never;
  }
  if (input.spec !== undefined) {
    const spec = cleanPage(input.spec);
    patch.spec = spec;
    patch.subject = spec.tiles[0]?.subject ?? "members";
  }

  try {
    await db.update(savedReports).set(patch).where(eq(savedReports.id, input.id));
  } catch (error) {
    if (String((error as { message?: string }).message ?? "").includes("saved_reports_name_unique")) {
      throw new NameTakenError("report.error.nameTaken", patch.name ?? "", input.id);
    }
    throw error;
  }
}

/** R2.13. Archived rather than deleted, like everything else a church made. */
export async function setSavedReportArchived(
  db: Tx,
  actor: Actor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!mayRead(actor)) throw new PermissionError(actor.role, "buildReports");
  await db
    .update(savedReports)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(savedReports.id, id), sql`true`));
}
