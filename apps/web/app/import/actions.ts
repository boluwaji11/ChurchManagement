"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, readSheet, guessMapping, listCustomFields, PERSON_FIELDS,
  plan, commit, canEditPeople,
  type DuplicateStrategy, type PlannedRow,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

/**
 * The wizard's three steps, as three server actions.
 *
 * The file's text travels with each call rather than being stashed somewhere.
 * A half-finished import sitting in a server-side session is state that can go
 * stale, leak between tabs, and has to be cleaned up. The file is the person's
 * own data and it is already in their browser.
 */

export interface FieldChoice {
  key: string;
  label: string;
}

export interface Inspection {
  error?: string;
  headers?: string[];
  mapping?: Record<string, string>;
  /** The first value in each column, so a person can see what they are mapping. */
  samples?: Record<string, string>;
  rowCount?: number;
  fields?: FieldChoice[];
}

/** Reads the file and guesses the mapping. Touches no data. */
export async function inspectFile(input: { church?: string; filename: string; text: string }): Promise<Inspection> {
  const session = await requireSession(input.church);
  if (!canEditPeople(session.role)) return { error: t("forbidden.addPeople") };

  const sheet = readSheet(input.text);
  if (sheet.headers.length === 0 || sheet.rows.length === 0) {
    return { error: t("import.emptyFile") };
  }

  const custom = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    listCustomFields(tx, "person"),
  );

  const samples: Record<string, string> = {};
  for (const header of sheet.headers) {
    samples[header] = sheet.rows.find((r) => (r[header] ?? "").trim() !== "")?.[header] ?? "";
  }

  return {
    headers: sheet.headers,
    mapping: guessMapping(sheet.headers, custom),
    samples,
    rowCount: sheet.rows.length,
    fields: [
      ...PERSON_FIELDS.map((f) => ({ key: f.key, label: t(f.label as never) })),
      ...custom.map((f) => ({ key: `cf:${f.id}`, label: f.label })),
    ],
  };
}

export interface PreviewRow {
  lineNumber: number;
  outcome: PlannedRow["outcome"];
  name: string;
  detail?: string;
}

export interface Preview {
  error?: string;
  totals?: { create: number; update: number; skip: number; fail: number };
  rows?: PreviewRow[];
  /** True when more rows exist than are shown. */
  truncated?: boolean;
}

/** How many rows of the preview are shown. Enough to judge, not enough to scroll forever. */
const PREVIEW_ROWS = 60;

export async function previewImport(input: {
  church?: string;
  filename: string;
  text: string;
  mapping: Record<string, string>;
  strategy: DuplicateStrategy;
}): Promise<Preview> {
  const session = await requireSession(input.church);
  if (!canEditPeople(session.role)) return { error: t("forbidden.addPeople") };

  const mapped = Object.values(input.mapping);
  if (!mapped.includes("firstName") || !mapped.includes("lastName")) {
    return { error: t("import.noFirstName") };
  }

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    plan(tx, { filename: input.filename, text: input.text, mapping: input.mapping, strategy: input.strategy }),
  );

  // Anything that will not simply be added comes first, because that is what a
  // person is actually checking. A list of 400 creates tells them nothing.
  const ordered = [...result.rows].sort((a, b) => {
    const rank = { fail: 0, skip: 1, update: 2, create: 3 };
    return rank[a.outcome] - rank[b.outcome] || a.lineNumber - b.lineNumber;
  });

  return {
    totals: result.totals,
    truncated: ordered.length > PREVIEW_ROWS,
    rows: ordered.slice(0, PREVIEW_ROWS).map((row) => ({
      lineNumber: row.lineNumber,
      outcome: row.outcome,
      name: `${row.person.firstName} ${row.person.lastName}`.trim() || "?",
      detail: describe(row),
    })),
  };
}

function describe(row: PlannedRow): string | undefined {
  if (row.reason) return t(row.reason, row.reasonParams);
  const match = row.matches[0];
  if (row.outcome === "update" && match) {
    return `${match.displayName}. ${t(match.reason)}.`;
  }
  return undefined;
}

export interface ImportResult {
  error?: string;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
}

export async function runImport(input: {
  church?: string;
  filename: string;
  text: string;
  mapping: Record<string, string>;
  strategy: DuplicateStrategy;
}): Promise<ImportResult> {
  const session = await requireSession(input.church);
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");

  try {
    const result = await withTenant(
      {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
        ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
      },
      async (tx) => {
        // Planned again, inside the same transaction that writes, so the preview
        // cannot be acted on against a church that has changed underneath it.
        const fresh = await plan(tx, {
          filename: input.filename,
          text: input.text,
          mapping: input.mapping,
          strategy: input.strategy,
        });
        return commit(tx, { tenantId: session.tenantId, role: session.role, userId: session.userId }, fresh);
      },
    );

    revalidatePath("/people");
    return { created: result.created, updated: result.updated, skipped: result.skipped, failed: result.failed };
  } catch (error) {
    return { error: explain(error) };
  }
}
