"use server";

import { revalidatePath } from "next/cache";
import { withTenant, markRead, markAllRead } from "@hearth/db";
import { requireSession } from "@/lib/session";

/** R24.6. One notification, read, on the way to wherever it points. */
export async function readOne(id: string, church?: string): Promise<void> {
  const session = await requireSession(church);
  await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => markRead(tx, session.userId, id),
  );
  revalidatePath("/", "layout");
}

/** R24.6. The link at the top of the panel. */
export async function readAll(church?: string): Promise<void> {
  const session = await requireSession(church);
  await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => markAllRead(tx, session.userId),
  );
  revalidatePath("/", "layout");
}
