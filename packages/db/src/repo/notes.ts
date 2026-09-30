import { and, desc, eq, sql as raw } from "drizzle-orm";
import type { Tx } from "../client";
import { notes } from "../schema/notes";
import { appUsers } from "../schema/tenancy";
import { canReadConfidentialNotes, type TenantRole } from "../roles";
import { decryptNote, encryptNote } from "../crypto";

/**
 * R6.2. A user without the confidential tier sees that a note exists, its date,
 * and its author, and cannot read its content through the UI, the API, an export,
 * or a report.
 *
 * `body` is absent from the object rather than null, so a consumer that forgets
 * to check `canRead` renders nothing instead of leaking an empty string. The
 * ciphertext never leaves this module.
 */
export interface NoteView {
  id: string;
  personId: string;
  classification: "general" | "confidential";
  authorName: string | null;
  createdAt: Date;
  /** Present only when the caller's role may read it. */
  body?: string;
  /** Explicit, so a UI can say "restricted" rather than "empty". */
  restricted: boolean;
}

export async function listNotesForPerson(
  db: Tx,
  personId: string,
  role: TenantRole,
  actor: { userId?: string; tenantId: string },
): Promise<NoteView[]> {
  const rows = await db
    .select({
      id: notes.id,
      personId: notes.personId,
      classification: notes.classification,
      body: notes.body,
      bodyEncrypted: notes.bodyEncrypted,
      createdAt: notes.createdAt,
      authorName: appUsers.fullName,
    })
    .from(notes)
    .leftJoin(appUsers, eq(appUsers.id, notes.authorUserId))
    .where(eq(notes.personId, personId))
    .orderBy(desc(notes.createdAt));

  const permitted = canReadConfidentialNotes(role);
  const readConfidential: string[] = [];

  const views = rows.map((r): NoteView => {
    if (r.classification === "general") {
      return {
        id: r.id, personId: r.personId, classification: "general",
        authorName: r.authorName, createdAt: r.createdAt,
        body: r.body ?? "", restricted: false,
      };
    }
    if (!permitted) {
      // No body key at all. Metadata only.
      return {
        id: r.id, personId: r.personId, classification: "confidential",
        authorName: r.authorName, createdAt: r.createdAt, restricted: true,
      };
    }
    readConfidential.push(r.id);
    return {
      id: r.id, personId: r.personId, classification: "confidential",
      authorName: r.authorName, createdAt: r.createdAt,
      body: r.bodyEncrypted ? decryptNote(r.bodyEncrypted) : "", restricted: false,
    };
  });

  /** R6.2. Every read of a confidential note writes an audit entry naming the reader. */
  for (const id of readConfidential) {
    await db.execute(raw`
      insert into audit_entries (tenant_id, actor_user_id, actor_role, action, entity, entity_id)
      values (
        ${actor.tenantId}::uuid,
        ${actor.userId ?? null},
        ${role},
        'read',
        'notes',
        ${id}::uuid
      )`);
  }

  return views;
}

export async function createNote(
  db: Tx,
  input: {
    tenantId: string;
    personId: string;
    classification: "general" | "confidential";
    body: string;
    authorUserId?: string;
  },
): Promise<{ id: string }> {
  const encrypted = input.classification === "confidential";
  const [row] = await db
    .insert(notes)
    .values({
      tenantId: input.tenantId,
      personId: input.personId,
      classification: input.classification,
      body: encrypted ? null : input.body,
      bodyEncrypted: encrypted ? encryptNote(input.body) : null,
      authorUserId: input.authorUserId ?? null,
    })
    .returning({ id: notes.id });
  if (!row) throw new Error("Note insert returned no row.");
  return row;
}

export async function countNotes(db: Tx, personId: string, classification: "general" | "confidential") {
  const rows = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.personId, personId), eq(notes.classification, classification)));
  return rows.length;
}
