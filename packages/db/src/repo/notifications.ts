import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { notifications } from "../schema/notifications";
import { tenantMembers } from "../schema/tenancy";
import type { TenantRole } from "../roles";

/**
 * R24.6. The bell in the top bar.
 *
 * A notification is a thing that happened which somebody should know about, and
 * it is written by whatever did the happening. Nothing polls, nothing is
 * computed at read time, so the count is one index scan.
 *
 * Each kind carries its own icon and hue, which is what makes a panel of eight
 * readable at a glance rather than eight identical grey lines.
 */
export const NOTIFICATION_KINDS = [
  "join_request", "serving_declined", "serving_accepted",
  "incident", "followup_assigned", "duplicate", "form_response",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** The hue and the icon per kind. The icon name is Lucide's. */
export const NOTIFICATION_LOOK: Record<NotificationKind, { hue: string; icon: string }> = {
  join_request: { hue: "fern", icon: "user-plus" },
  serving_declined: { hue: "rose", icon: "circle-x" },
  serving_accepted: { hue: "fern", icon: "circle-check" },
  incident: { hue: "amber", icon: "triangle-alert" },
  followup_assigned: { hue: "sky", icon: "user-plus" },
  duplicate: { hue: "violet", icon: "copy" },
  form_response: { hue: "sky", icon: "clipboard-list" },
};

export interface Notification {
  id: string;
  kind: NotificationKind;
  messageKey: string;
  params: Record<string, string | number>;
  href: string | null;
  unread: boolean;
  createdAt: string;
}

export interface NotifyInput {
  kind: NotificationKind;
  messageKey: string;
  params?: Record<string, string | number>;
  href?: string | null;
}

/** R24.6. Tells specific people. */
export async function notifyUsers(
  db: Tx,
  tenantId: string,
  userIds: string[],
  input: NotifyInput,
): Promise<void> {
  const to = [...new Set(userIds.filter(Boolean))];
  if (to.length === 0) return;

  await db.insert(notifications).values(
    to.map((userId) => ({
      tenantId,
      userId,
      kind: input.kind,
      messageKey: input.messageKey,
      params: input.params ?? {},
      href: input.href ?? null,
    })),
  );
}

/**
 * R24.6. Tells whoever holds one of these roles.
 *
 * A join request is not addressed to a person, it is addressed to whoever can
 * answer it, and in most churches that is one or two people.
 */
export async function notifyRoles(
  db: Tx,
  tenantId: string,
  roles: TenantRole[],
  input: NotifyInput,
): Promise<void> {
  if (roles.length === 0) return;

  const rows = await db
    .select({ userId: tenantMembers.userId })
    .from(tenantMembers)
    .where(inArray(tenantMembers.role, roles as never[]));

  await notifyUsers(db, tenantId, rows.map((r) => r.userId), input);
}

/** R24.6. How many a person has not read. The number on the bell. */
export async function countUnread(db: Tx, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} is null`));
  return row?.n ?? 0;
}

/** R24.6. What the panel shows. Newest first, unread or not. */
export async function listNotifications(
  db: Tx,
  userId: string,
  limit = 20,
): Promise<Notification[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as NotificationKind,
    messageKey: row.messageKey,
    params: row.params ?? {},
    href: row.href,
    unread: row.readAt === null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** R24.6. One of them, read. */
export async function markRead(db: Tx, userId: string, id: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

/** R24.6. All of them, read. The link at the top of the panel. */
export async function markAllRead(db: Tx, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} is null`));
}
