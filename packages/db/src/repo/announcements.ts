import { and, desc, eq, isNull, or, gte, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { announcements } from "../schema/announcements";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";
import type { WriteActor } from "./members";

/**
 * R16.11. The announcement feed.
 *
 * F16 is deferred and this is the part of it that does not send anything: a
 * church writes a line, its members read it in the portal. No provider, no
 * credentials, no queue, nothing resold. The push that already exists carries
 * it to whoever turned push on, through the browser's own service.
 *
 * A church of 50 to 500 writes one of these a fortnight, so there is no
 * scheduling and no targeting. It is published or it is not, it sits at the
 * top or it does not, and it comes off on a date or it stays.
 */

export interface Announcement {
  id: string;
  title: string;
  body: string;
  hue: string;
  pinned: boolean;
  publishedAt: Date | null;
  expiresOn: string | null;
  archived: boolean;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  hue?: string;
  pinned?: boolean;
  expiresOn?: string | null;
  /** R16.11. Published on save, or kept back as a draft. */
  publish?: boolean;
}

/** Only somebody who speaks for the church writes what the church says. */
function guard(actor: WriteActor): void {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");
}

const clean = (raw: string): string => raw.trim().replace(/\s+/g, " ");

const row = {
  id: announcements.id,
  title: announcements.title,
  body: announcements.body,
  hue: announcements.hue,
  pinned: announcements.pinned,
  publishedAt: announcements.publishedAt,
  expiresOn: sql<string | null>`${announcements.expiresOn}::text`,
  archivedAt: announcements.archivedAt,
};

const shape = (one: {
  archivedAt: Date | null;
} & Omit<Announcement, "archived">): Announcement => {
  const { archivedAt, ...rest } = one;
  return { ...rest, archived: archivedAt !== null };
};

/**
 * R16.11. What a member reads.
 *
 * Published, not archived, and not past its day. Pinned first, then newest,
 * which is the order a noticeboard is read in.
 */
export async function feedFor(db: Tx, today: string, limit = 10): Promise<Announcement[]> {
  const rows = await db
    .select(row)
    .from(announcements)
    .where(and(
      isNull(announcements.archivedAt),
      sql`${announcements.publishedAt} is not null`,
      or(isNull(announcements.expiresOn), gte(announcements.expiresOn, today)),
    ))
    .orderBy(desc(announcements.pinned), desc(announcements.publishedAt))
    .limit(limit);

  return rows.map(shape);
}

/** R16.11. What the church sees, drafts and expired ones included. */
export async function listAnnouncements(
  db: Tx,
  options: { archivedOnly?: boolean } = {},
): Promise<Announcement[]> {
  const rows = await db
    .select(row)
    .from(announcements)
    .where(options.archivedOnly
      ? sql`${announcements.archivedAt} is not null`
      : isNull(announcements.archivedAt))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt));

  return rows.map(shape);
}

export async function countArchivedAnnouncements(db: Tx): Promise<number> {
  const [found] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(announcements)
    .where(sql`${announcements.archivedAt} is not null`);
  return found?.n ?? 0;
}

export async function getAnnouncement(db: Tx, id: string): Promise<Announcement | null> {
  const [found] = await db.select(row).from(announcements).where(eq(announcements.id, id)).limit(1);
  return found ? shape(found) : null;
}

function checked(input: AnnouncementInput): { title: string; body: string } {
  const title = clean(input.title);
  if (!title) throw new InvalidInputError("announce.error.title");

  const body = input.body.trim();
  if (!body) throw new InvalidInputError("announce.error.body");

  return { title, body };
}

export async function writeAnnouncement(
  db: Tx,
  actor: WriteActor,
  input: AnnouncementInput,
): Promise<Announcement> {
  guard(actor);
  const { title, body } = checked(input);

  const [made] = await db
    .insert(announcements)
    .values({
      tenantId: actor.tenantId,
      title,
      body,
      hue: input.hue ?? "indigo",
      pinned: input.pinned ?? false,
      expiresOn: input.expiresOn || null,
      publishedAt: input.publish ? new Date() : null,
      writtenByUserId: actor.userId ?? null,
    })
    .returning(row);

  return shape(made!);
}

/**
 * R16.11. Changing one.
 *
 * Publishing is a one-way door here: the moment it was published is kept, so
 * taking one down archives it rather than quietly un-publishing something
 * members have already read.
 */
export async function updateAnnouncement(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: AnnouncementInput,
): Promise<void> {
  guard(actor);
  const { title, body } = checked(input);

  const held = await getAnnouncement(db, id);
  if (!held) throw new InvalidInputError("announce.error.gone");

  await db
    .update(announcements)
    .set({
      title,
      body,
      hue: input.hue ?? "indigo",
      pinned: input.pinned ?? false,
      expiresOn: input.expiresOn || null,
      publishedAt: held.publishedAt ?? (input.publish ? new Date() : null),
      updatedAt: new Date(),
    })
    .where(eq(announcements.id, id));
}

/** R16.11, R2.13. Off the board, and back on it. */
export async function setAnnouncementArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  guard(actor);
  await db
    .update(announcements)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(announcements.id, id));
}
