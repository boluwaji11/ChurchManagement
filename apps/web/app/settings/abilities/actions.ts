"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, addAbility, renameAbility, setAbilityArchived, canManageChurch,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

export interface AbilityResult {
  error?: string;
}

async function allowed(church?: string) {
  const session = await requireSession(church);
  if (!canManageChurch(session.role)) throw new Error(t("forbidden.askAdmin"));
  return session;
}

/** R2.9. Adding to one of the three lists. */
export async function add(data: FormData): Promise<AbilityResult> {
  try {
    const session = await allowed(String(data.get("church") ?? "") || undefined);
    await withTenant(session, (tx) =>
      addAbility(tx, session, {
        kind: String(data.get("kind") ?? ""),
        name: String(data.get("name") ?? ""),
      }),
    );
    revalidatePath("/settings/abilities");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function rename(id: string, name: string, church?: string): Promise<AbilityResult> {
  try {
    const session = await allowed(church);
    await withTenant(session, (tx) => renameAbility(tx, session, { id, name }));
    revalidatePath("/settings/abilities");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archive(id: string, archived: boolean, church?: string): Promise<AbilityResult> {
  try {
    const session = await allowed(church);
    await withTenant(session, (tx) => setAbilityArchived(tx, session, { id, archived }));
    revalidatePath("/settings/abilities");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
