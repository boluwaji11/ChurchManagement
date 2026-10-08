"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, writeAnnouncement, updateAnnouncement, setAnnouncementArchived,
} from "@connectapp/db";
import { HUES } from "@connectapp/ui";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface AnnounceResult {
  error?: string;
}

async function actor(church?: string) {
  const session = await requireSession(church);
  return {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "");

/** R16.11. The announcement as the panel wrote it. */
function read(data: FormData) {
  const hue = field(data, "hue");
  return {
    title: field(data, "title"),
    body: field(data, "body"),
    hue: (HUES as readonly string[]).includes(hue) ? hue : "indigo",
    pinned: field(data, "pinned") === "on",
    expiresOn: field(data, "expiresOn") || null,
    publish: field(data, "publish") === "yes",
  };
}

export async function saveAnnouncement(data: FormData): Promise<AnnounceResult> {
  const who = await actor(field(data, "church") || undefined);
  const id = field(data, "id");

  try {
    await withTenant(who, (tx) =>
      id
        ? updateAnnouncement(tx, who, id, read(data))
        : writeAnnouncement(tx, who, read(data)).then(() => {}),
    );
    revalidatePath("/settings/announcements");
    revalidatePath("/home");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R16.11, R2.13. Off the board, and back on it. */
export async function archiveAnnouncement(
  id: string,
  archived: boolean,
  church?: string,
): Promise<AnnounceResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => setAnnouncementArchived(tx, who, id, archived));
    revalidatePath("/settings/announcements");
    revalidatePath("/home");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
