"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, readImportFile, guessMapping, listCustomFields, PERSON_FIELDS,
  plan, commit, rollbackImport, canEditPeople, detectSource, sourceMapping, IMPORT_SOURCES,
  isGroupSheet, guessGroupMapping, GROUP_FIELDS, planGroups, commitGroups, rollbackGroupImport,
  canManageGroups, type TenantRole,
  type DuplicateStrategy, type PlannedRow, type PlannedGroupRow, type Sheet,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
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
  /** R19.5. The system this file came out of, where the headers say so. */
  source?: string;
  /** R19.5. True when the rows are memberships rather than members. */
  groups?: boolean;
}

/**
 * What the browser sends.
 *
 * A text file travels as text. A workbook is a zip and travels as base64, which
 * is a third larger on the wire and is still the simplest thing that cannot
 * corrupt bytes on the way.
 */
export interface FilePayload {
  filename: string;
  text?: string;
  base64?: string;
}

const read = (file: FilePayload): Promise<Sheet> =>
  readImportFile({
    filename: file.filename,
    text: file.text,
    bytes: file.base64 ? Buffer.from(file.base64, "base64") : undefined,
  });

/** Reads the file and guesses the mapping. Touches no data. */
export async function inspectFile(input: { church?: string } & FilePayload): Promise<Inspection> {
  const session = await requireSession(input.church);
  if (!canEditPeople(session)) return { error: t("forbidden.addPeople") };

  const sheet = await read(input);
  if (sheet.headers.length === 0 || sheet.rows.length === 0) {
    return { error: t("import.emptyFile") };
  }

  const samples: Record<string, string> = {};
  for (const header of sheet.headers) {
    samples[header] = sheet.rows.find((r) => (r[header] ?? "").trim() !== "")?.[header] ?? "";
  }

  // R19.5. A file of memberships goes through the same three steps, against a
  // different set of fields. Which one it is comes from the headers rather than
  // from asking, because a church exporting its groups knows what it exported.
  if (isGroupSheet(sheet.headers)) {
    if (!canManageGroups(session)) return { error: t("forbidden.askAdmin") };
    return {
      headers: sheet.headers,
      mapping: guessGroupMapping(sheet.headers),
      groups: true,
      source: t("import.group.detected"),
      samples,
      rowCount: sheet.rows.length,
      fields: GROUP_FIELDS.map((f) => ({ key: f.key, label: t(f.label as never) })),
    };
  }

  const custom = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    listCustomFields(tx, "person"),
  );

  // R19.5. A Planning Center, Breeze or ChurchTrac export arrives already
  // matched. Their own column names sit over the generic guess, and anything
  // they do not name falls through to it, so a church that added its own column
  // still gets that matched too.
  const guess = guessMapping(sheet.headers, custom);
  const source = detectSource(sheet.headers);

  return {
    headers: sheet.headers,
    mapping: source ? sourceMapping(source, sheet.headers, guess) : guess,
    source: source
      ? t(IMPORT_SOURCES.find((row) => row.key === source)!.label as never)
      : undefined,
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
  /** R19.5. The groups a membership file would bring into existence. */
  newGroups?: string[];
  /** R1.1. Set while the church is still being reviewed. */
  cap?: { limit: number; room: number; held: number };
}

/** How many rows of the preview are shown. Enough to judge, not enough to scroll forever. */
const PREVIEW_ROWS = 60;

export async function previewImport(input: {
  church?: string;
  mapping: Record<string, string>;
  strategy: DuplicateStrategy;
  groups?: boolean;
} & FilePayload): Promise<Preview> {
  const session = await requireSession(input.church);
  if (input.groups) return previewGroups(session, input);
  if (!canEditPeople(session)) return { error: t("forbidden.addPeople") };

  const mapped = Object.values(input.mapping);
  if (!mapped.includes("firstName") || !mapped.includes("lastName")) {
    return { error: t("import.noFirstName") };
  }

  const sheet = await read(input);
  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    plan(tx, { filename: input.filename, sheet, mapping: input.mapping, strategy: input.strategy, tenantId: session.tenantId }),
  );

  // Anything that will not simply be added comes first, because that is what a
  // person is actually checking. A list of 400 creates tells them nothing.
  const ordered = [...result.rows].sort((a, b) => {
    const rank = { fail: 0, skip: 1, update: 2, create: 3 };
    return rank[a.outcome] - rank[b.outcome] || a.lineNumber - b.lineNumber;
  });

  return {
    totals: result.totals,
    cap: result.cap,
    truncated: ordered.length > PREVIEW_ROWS,
    rows: ordered.slice(0, PREVIEW_ROWS).map((row) => ({
      lineNumber: row.lineNumber,
      outcome: row.outcome,
      name: `${row.person.firstName} ${row.person.lastName}`.trim() || "?",
      detail: describe(row),
    })),
  };
}

/** R19.5. The same dry run, over a file of memberships. */
async function previewGroups(
  session: { tenantId: string; role: TenantRole },
  input: { mapping: Record<string, string> } & FilePayload,
): Promise<Preview> {
  if (!canManageGroups(session)) return { error: t("forbidden.askAdmin") };
  if (!Object.values(input.mapping).includes("groupName")) {
    return { error: t("import.group.noColumn") };
  }

  const sheet = await read(input);
  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    planGroups(tx, { filename: input.filename, sheet, mapping: input.mapping }),
  );

  const ordered = [...result.rows].sort((a, b) => {
    const rank = { fail: 0, skip: 1, create: 2 };
    return rank[a.outcome] - rank[b.outcome] || a.lineNumber - b.lineNumber;
  });

  return {
    totals: { ...result.totals, update: 0 },
    newGroups: result.newGroups,
    truncated: ordered.length > PREVIEW_ROWS,
    rows: ordered.slice(0, PREVIEW_ROWS).map((row) => ({
      lineNumber: row.lineNumber,
      outcome: row.outcome,
      name: row.personName || "?",
      detail: describeGroupRow(row),
    })),
  };
}

function describeGroupRow(row: PlannedGroupRow): string | undefined {
  if (row.reason) return t(row.reason, row.reasonParams);
  if (row.outcome === "create") return row.groupName;
  return undefined;
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
  /** R19.4. The batch, so the screen that reports it can also undo it. */
  batchId?: string;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
}

export async function runImport(input: {
  church?: string;
  mapping: Record<string, string>;
  strategy: DuplicateStrategy;
  groups?: boolean;
} & FilePayload): Promise<ImportResult> {
  const session = await requireSession(input.church);
  const sheet = await read(input);

  if (input.groups) {
    try {
      const result = await withTenant(
        { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
        async (tx) => {
          const fresh = await planGroups(tx, {
            filename: input.filename,
            sheet,
            mapping: input.mapping,
          });
          return commitGroups(
            tx,
            { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
            fresh,
          );
        },
      );
      revalidatePath("/groups");
      return {
        batchId: result.batchId,
        created: result.joined,
        updated: result.groupsCreated,
        skipped: result.skipped,
        failed: result.failed,
      };
    } catch (error) {
      return { error: explain(error) };
    }
  }

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
          sheet,
          mapping: input.mapping,
          strategy: input.strategy,
          tenantId: session.tenantId,
        });
        return commit(tx, { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions }, fresh);
      },
    );

    revalidatePath("/members");
    return {
      batchId: result.batchId,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    };
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface RollbackOutcome {
  error?: string;
  removed?: number;
  restored?: number;
  archived?: number;
}

/** R19.4. Undoes a completed import, as one operation. */
export async function undoImport(data: FormData): Promise<RollbackOutcome> {
  const slug = String(data.get("church") ?? "") || undefined;
  const batchId = String(data.get("batchId") ?? "");
  const kind = String(data.get("kind") ?? "members");
  if (!batchId) return { error: t("error.notFound.import") };

  const session = await requireSession(slug);
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
        // R19.5. A group file put members into groups and created some groups.
        // Undoing it takes them back out, which is a different operation from
        // taking a person out of the directory.
        if (kind === "groups") {
          const undone = await rollbackGroupImport(
            tx,
            { tenantId: session.tenantId, role: session.role },
            batchId,
          );
          return { removed: undone.left, restored: 0, archived: undone.groupsArchived };
        }
        return rollbackImport(
          tx,
          { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
          batchId,
        );
      },
    );

    revalidatePath("/members");
    revalidatePath("/groups");
    revalidatePath("/import");
    return result;
  } catch (error) {
    return { error: explain(error) };
  }
}
