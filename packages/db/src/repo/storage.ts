import { and, desc, eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { tenants, storedFiles } from "../schema/tenancy";
import { canManageChurch } from "./church";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";

/**
 * R1.16. Hard storage quotas, enforced and visible.
 *
 * Support is the real cost of a free platform, and storage is the one cost that
 * grows without anybody deciding to spend it. So the limit is checked here,
 * before the bytes are written, rather than discovered on a bill. A church that
 * is over its quota can still read and delete; it cannot add.
 *
 * Sermon video is a non-goal. Link to YouTube.
 */

/** Where the bar turns amber. R1.16 asks for a warning at 80%. */
export const WARN_AT = 0.8;

export const ONE_MIB = 1024 * 1024;

/** What may be stored, and the largest each is allowed to be. */
export const UPLOAD_RULES = {
  logo: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 2 * ONE_MIB },
  person_photo: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * ONE_MIB },
  /**
   * R11.7. What hangs off an item on a service plan: chord charts, a running
   * order as a PDF, a reference track, a slide image, a lyric sheet.
   *
   * No video. Sermon video is a non-goal and a church that uploads one fills
   * its quota in a single file.
   */
  plan_item: {
    types: [
      "application/pdf",
      "image/png", "image/jpeg", "image/webp",
      "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav",
      "text/plain",
    ],
    maxBytes: 10 * ONE_MIB,
  },
} as const;

export type UploadPurpose = keyof typeof UPLOAD_RULES;

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  /** 0 to 1, clamped, so a quota of zero does not divide by it. */
  fraction: number;
  warning: boolean;
  full: boolean;
  files: number;
}

export async function getStorageUsage(db: Tx, tenantId: string): Promise<StorageUsage> {
  const [quota] = await db
    .select({ bytes: tenants.storageQuotaBytes })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const [used] = await db
    .select({
      bytes: sql<string>`coalesce(sum(${storedFiles.bytes}), 0)`,
      files: sql<string>`count(*)`,
    })
    .from(storedFiles);

  const quotaBytes = quota?.bytes ?? 0;
  const usedBytes = Number(used?.bytes ?? 0);
  const fraction = quotaBytes > 0 ? Math.min(usedBytes / quotaBytes, 1) : 1;

  return {
    usedBytes,
    quotaBytes,
    fraction,
    warning: fraction >= WARN_AT,
    full: usedBytes >= quotaBytes,
    files: Number(used?.files ?? 0),
  };
}

export interface StoredFile {
  id: string;
  bucket: string;
  key: string;
  purpose: string;
  contentType: string;
  bytes: number;
  createdAt: Date;
}

export async function listFiles(db: Tx, purpose?: UploadPurpose): Promise<StoredFile[]> {
  return db
    .select({
      id: storedFiles.id, bucket: storedFiles.bucket, key: storedFiles.key,
      purpose: storedFiles.purpose, contentType: storedFiles.contentType,
      bytes: storedFiles.bytes, createdAt: storedFiles.createdAt,
    })
    .from(storedFiles)
    .where(purpose ? eq(storedFiles.purpose, purpose) : undefined)
    .orderBy(desc(storedFiles.createdAt));
}

export interface UploadCheck {
  purpose: UploadPurpose;
  contentType: string;
  bytes: number;
}

/**
 * Whether these bytes may be written, asked before they are.
 *
 * Type, size and quota in that order, so the message names the first thing
 * wrong rather than the last. Throws, because every caller either writes the
 * file or tells somebody why not.
 */
export async function assertCanStore(
  db: Tx,
  tenantId: string,
  check: UploadCheck,
): Promise<StorageUsage> {
  const rule = UPLOAD_RULES[check.purpose];
  if (!rule) throw new InvalidInputError("storage.error.purpose");

  if (!(rule.types as readonly string[]).includes(check.contentType)) {
    throw new InvalidInputError("storage.error.type");
  }
  if (check.bytes <= 0) throw new InvalidInputError("storage.error.empty");
  if (check.bytes > rule.maxBytes) {
    throw new InvalidInputError("storage.error.tooBig", {
      limit: String(Math.round(rule.maxBytes / ONE_MIB)),
    });
  }

  const usage = await getStorageUsage(db, tenantId);
  if (usage.usedBytes + check.bytes > usage.quotaBytes) {
    throw new InvalidInputError("storage.error.quota");
  }
  return usage;
}

export interface RecordFileInput extends UploadCheck {
  key: string;
  bucket?: string;
  uploadedByUserId?: string | null;
}

/** Writes the ledger row. The object is already in the bucket by this point. */
export async function recordFile(
  db: Tx,
  actor: WriteActor,
  input: RecordFileInput,
): Promise<StoredFile> {
  const [row] = await db
    .insert(storedFiles)
    .values({
      tenantId: actor.tenantId,
      bucket: input.bucket ?? "church",
      key: input.key,
      purpose: input.purpose,
      contentType: input.contentType,
      bytes: input.bytes,
      uploadedByUserId: input.uploadedByUserId ?? null,
    })
    .returning({
      id: storedFiles.id, bucket: storedFiles.bucket, key: storedFiles.key,
      purpose: storedFiles.purpose, contentType: storedFiles.contentType,
      bytes: storedFiles.bytes, createdAt: storedFiles.createdAt,
    });
  return row!;
}

/** Forgets a file, returning its key so the caller can remove the object too. */
export async function forgetFile(
  db: Tx,
  actor: WriteActor,
  key: string,
): Promise<{ key: string } | null> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const [row] = await db
    .delete(storedFiles)
    .where(and(eq(storedFiles.key, key), eq(storedFiles.bucket, "church")))
    .returning({ key: storedFiles.key });
  return row ?? null;
}

/** Sets or clears the church's logo, and keeps the ledger in step. */
export async function setChurchLogo(
  db: Tx,
  actor: WriteActor,
  key: string | null,
): Promise<{ removed: string | null }> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const [before] = await db
    .select({ logoKey: tenants.logoKey })
    .from(tenants)
    .where(eq(tenants.id, actor.tenantId))
    .limit(1);

  await db
    .update(tenants)
    .set({ logoKey: key, updatedAt: new Date() })
    .where(eq(tenants.id, actor.tenantId));

  // The old one goes, so replacing a logo ten times costs one logo rather than
  // ten. The caller removes the object itself.
  const old = before?.logoKey ?? null;
  if (old && old !== key) {
    await db.delete(storedFiles).where(eq(storedFiles.key, old));
    return { removed: old };
  }
  return { removed: null };
}

/** "1.4 MB". Bytes on a screen are for machines. */
export function humanBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ["kB", "MB", "GB", "TB"];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
