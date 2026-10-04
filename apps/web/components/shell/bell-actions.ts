"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, markRead, markAllRead, listNotifications, NOTIFICATION_LOOK,
} from "@hearth/db";
import { when } from "@/lib/when";
import type { BellItem } from "./bell";
import { requireSession } from "@/lib/session";

/** R24.6. One notification, read, on the way to wherever it points. */
export async function readOne(id: string, church?: string): Promise<void> {
  const session = await requireSession(church);
  await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => markRead(tx, session.userId, id),
  );
  revalidatePath("/", "layout");
}

/** R24.6. The link at the top of the panel. */
export async function readAll(church?: string): Promise<void> {
  const session = await requireSession(church);
  await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => markAllRead(tx, session.userId),
  );
  revalidatePath("/", "layout");
}

/** R24.6. The next ten lines, for Show more. */
export async function olderThan(cursor: string, church?: string): Promise<BellItem[]> {
  const session = await requireSession(church);
  const rows = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => listNotifications(tx, session.userId, { before: cursor }),
  );

  return rows.map((one) => ({
    id: one.id,
    kind: NOTIFICATION_LOOK[one.kind].icon,
    hue: NOTIFICATION_LOOK[one.kind].hue,
    messageKey: one.messageKey,
    params: one.params,
    href: one.href,
    unread: one.unread,
    when: when(one.createdAt),
    at: one.createdAt,
    more: one.more ?? false,
  }));
}
