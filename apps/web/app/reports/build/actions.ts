"use server";

import {
  withTenant, runReport, createSavedReport, updateSavedReport, setSavedReportArchived,
  getSavedReport,
  canEditPeople, canReadIncidents, SCREEN_LIMIT,
  type ReportResult, type ReportSpec, type ReportPage,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context(church?: string) {
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    throw new Error("forbidden.askAdmin");
  }
  return {
    session,
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
  };
}

/** One visual's answer, or why it has none. */
export type ReportResultish = ReportResult & { error?: string };

export interface PreviewResult {
  result?: ReportResult;
  error?: string;
}

/**
 * R18.x. What the report being built says right now.
 *
 * Run on the server against the catalogue every time, so the preview is the
 * same query the saved report will be. A preview drawn from a different code
 * path is a preview that lies on the day it matters.
 */
export async function preview(spec: ReportSpec, church?: string): Promise<PreviewResult> {
  try {
    const { ctx } = await context(church);
    const result = await withTenant(ctx, (tx) => runReport(tx, spec, { limit: SCREEN_LIMIT }));
    return { result };
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R18.12. Every visual on the page, in one round trip.
 *
 * One request rather than one per tile: a page of six visuals redrawing on
 * every change is six requests a church on a village connection waits for, and
 * they all read the same church in the same transaction anyway.
 */
export async function previewPage(
  tiles: (ReportSpec & { id: string })[],
  church?: string,
): Promise<Record<string, ReportResultish>> {
  try {
    const { ctx } = await context(church);
    return await withTenant(ctx, async (tx) => {
      const out: Record<string, ReportResultish> = {};
      for (const tile of tiles) {
        try {
          out[tile.id] = await runReport(tx, tile, { limit: SCREEN_LIMIT });
        } catch (error) {
          out[tile.id] = {
            columns: [], rows: [], chart: null, grid: null, total: null, more: false,
            error: explain(error),
          };
        }
      }
      return out;
    });
  } catch (error) {
    return { page: {
      columns: [], rows: [], chart: null, grid: null, total: null, more: false,
      error: explain(error),
    } };
  }
}

export interface SaveResult {
  /** The report's readable address, for where to go next. */
  slug?: string;
  error?: string;
}

export async function saveReport(
  input: { id?: string; name: string; spec: ReportPage },
  church?: string,
): Promise<SaveResult> {
  try {
    const { ctx } = await context(church);
    return await withTenant(ctx, async (tx) => {
      if (input.id) {
        await updateSavedReport(tx, ctx, { id: input.id, name: input.name, spec: input.spec });
        // Renaming moves the address, so the fresh one is read back.
        const after = await getSavedReport(tx, input.id);
        return { slug: after?.slug };
      }
      const made = await createSavedReport(tx, ctx, { name: input.name, spec: input.spec });
      return { slug: made.slug };
    });
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.13. Taken off the list, kept in the records. */
export async function archiveReport(
  id: string,
  archived: boolean,
  church?: string,
): Promise<{ error?: string }> {
  try {
    const { ctx } = await context(church);
    await withTenant(ctx, (tx) => setSavedReportArchived(tx, ctx, id, archived));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
