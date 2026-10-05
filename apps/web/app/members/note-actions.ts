"use server";

import { withTenant, createNote, canEditPeople, canReadConfidentialNotes } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface NoteResult {
  error?: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

/**
 * R2.7. Writing something down about somebody.
 *
 * A confidential note is encrypted before it is stored and is readable by the
 * roles that may read one, which is a narrower list than the roles that may
 * write a general note. Somebody who cannot read confidential notes cannot
 * write one either: a note nobody can open again is not a record.
 */
export async function addNote(data: FormData): Promise<NoteResult> {
  const session = await requireSession(field(data, "church") || undefined);
  const ctx = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };

  const body = field(data, "body");
  const confidential = field(data, "classification") === "confidential";

  if (!body) return { error: t("notes.error.empty") };
  if (!canEditPeople(session)) return { error: t("forbidden.askAdmin") };
  if (confidential && !canReadConfidentialNotes(session)) {
    return { error: t("forbidden.askAdmin") };
  }

  try {
    await withTenant(ctx, (tx) =>
      createNote(tx, {
        tenantId: session.tenantId,
        memberId: field(data, "memberId"),
        classification: confidential ? "confidential" : "general",
        body,
        authorUserId: session.userId,
      }),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
