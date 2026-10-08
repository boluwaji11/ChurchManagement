import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Sql, TransactionSql } from "postgres";
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
/**
 * R24.6. How long a notification is kept.
 *
 * A bell is a list of what to do about this week, so a line from April is
 * noise. Older rows are deleted on the next write rather than kept forever,
 * which also keeps the table bounded without a job to run.
 */
export const NOTIFICATION_KEEP_DAYS = 30;

/** How many the panel opens with, before Show more. */
export const NOTIFICATION_PAGE = 10;

export const NOTIFICATION_KINDS = [
  "join_request", "serving_declined", "serving_accepted",
  "incident", "followup_assigned", "duplicate", "form_response", "message",
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
  message: { hue: "indigo", icon: "message-square" },
};

export interface Notification {
  id: string;
  kind: NotificationKind;
  messageKey: string;
  params: Record<string, string | number>;
  href: string | null;
  unread: boolean;
  createdAt: string;
  /** Set on the last line when more are waiting behind it. */
  more?: boolean;
}

export interface NotifyInput {
  kind: NotificationKind;
  messageKey: string;
  params?: Record<string, string | number>;
  href?: string | null;
}

/** Only the last 30 days are ever read, whatever is still in the table. */
const recent = () =>
  sql`${notifications.createdAt} > now() - ${sql.raw(`interval '${NOTIFICATION_KEEP_DAYS} days'`)}`;

/**
 * R24.6. Drops everything past the keep window for this church.
 *
 * Called on the write path, because that is the only thing that runs on its
 * own schedule here, and a church that stops generating notifications has no
 * rows piling up to clear.
 */
export async function pruneNotifications(db: Tx): Promise<void> {
  await db
    .delete(notifications)
    .where(sql`${notifications.createdAt} <= now() - ${sql.raw(`interval '${NOTIFICATION_KEEP_DAYS} days'`)}`);
}

/** R24.6. Tells specific members. */
export async function notifyUsers(
  db: Tx,
  tenantId: string,
  userIds: string[],
  input: NotifyInput,
  /**
   * R24.6. One unread line stands for however many times the thing happened.
   *
   * A member writing four lines in a minute is one thing for the office to
   * answer, so a reader who has not read the first line is not told again.
   */
  options: { onlyIfUnread?: boolean } = {},
): Promise<void> {
  let to = [...new Set(userIds.filter(Boolean))];
  if (to.length === 0) return;

  if (options.onlyIfUnread) {
    const held = await db
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.kind, input.kind),
        eq(notifications.messageKey, input.messageKey),
        isNull(notifications.readAt),
        inArray(notifications.userId, to),
      ));
    const already = new Set(held.map((one) => one.userId));
    to = to.filter((one) => !already.has(one));
    if (to.length === 0) return;
  }

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

  await pruneNotifications(db);
}

/**
 * R24.6. Tells whoever holds one of these roles.
 *
 * A join request is not addressed to a person, it is addressed to whoever can
 * answer it, and in most churches that is one or two members.
 */
export async function notifyRoles(
  db: Tx,
  tenantId: string,
  roles: TenantRole[],
  input: NotifyInput,
  options: { onlyIfUnread?: boolean } = {},
): Promise<void> {
  if (roles.length === 0) return;

  const rows = await db
    .select({ userId: tenantMembers.userId })
    .from(tenantMembers)
    .where(and(
      // RLS already holds this to one church. Named again because the same
      // call on a connection without it would tell every church in the table.
      eq(tenantMembers.tenantId, tenantId),
      inArray(tenantMembers.role, roles as never[]),
    ));

  await notifyUsers(db, tenantId, rows.map((r) => r.userId), input, options);
}

/**
 * R24.6. The same, written on the raw connection.
 *
 * A public form is answered by somebody with no account and no church, so it
 * is saved on the owner connection, and the church it belongs to is the form's
 * rather than the session's. The tenant is therefore filtered here rather than
 * left to a policy, and both statements name it.
 */
export async function notifyRolesRaw(
  tx: Sql | TransactionSql,
  tenantId: string,
  roles: TenantRole[],
  input: NotifyInput,
  options: { onlyIfUnread?: boolean } = {},
): Promise<void> {
  if (roles.length === 0) return;

  /*
   * R24.6. One line per thing, not one per answer.
   *
   * A form is answered by everybody who sees it, and a bell with eighty lines
   * saying the same form has answers is a bell nobody opens. Where the line
   * already says "has new responses", a second one adds nothing: it is
   * written only while nobody has read the first.
   */
  await tx`
    insert into notifications (tenant_id, user_id, kind, message_key, params, href)
    select ${tenantId}, m.user_id, ${input.kind}, ${input.messageKey},
           ${JSON.stringify(input.params ?? {})}::jsonb, ${input.href ?? null}
      from tenant_members m
     where m.tenant_id = ${tenantId}
       and m.role::text = any(${roles as string[]})
       and (${!options.onlyIfUnread} or not exists (
             select 1 from notifications n
              where n.tenant_id = ${tenantId}
                and n.user_id = m.user_id
                and n.kind = ${input.kind}
                and n.href is not distinct from ${input.href ?? null}
                and n.read_at is null))`;

  await tx`
    delete from notifications
     where tenant_id = ${tenantId}
       and created_at < now() - ${`${NOTIFICATION_KEEP_DAYS} days`}::interval`;
}

/** R24.6. How many a person has not read. The number on the bell. */
export async function countUnread(db: Tx, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} is null`, recent()));
  return row?.n ?? 0;
}

/** R24.6. What the panel shows. Newest first, unread or not. */
export async function listNotifications(
  db: Tx,
  userId: string,
  opts: {
    limit?: number;
    /** The createdAt of the last line already on screen, for Show more. */
    before?: string | null;
  } = {},
): Promise<Notification[]> {
  const limit = opts.limit ?? NOTIFICATION_PAGE;

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        recent(),
        opts.before ? sql`${notifications.createdAt} < ${new Date(opts.before)}` : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    // One more than asked for, so the panel knows whether to offer Show more
    // without a second count.
    .limit(limit + 1);

  return rows.slice(0, limit).map((row) => ({
    id: row.id,
    kind: row.kind as NotificationKind,
    messageKey: row.messageKey,
    params: row.params ?? {},
    href: row.href,
    unread: row.readAt === null,
    createdAt: row.createdAt.toISOString(),
    /** True on the last row returned when there is at least one more behind it. */
    more: false,
  })).map((one, i, all) => (i === all.length - 1 ? { ...one, more: rows.length > limit } : one));
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
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} is null`, recent()));
}
