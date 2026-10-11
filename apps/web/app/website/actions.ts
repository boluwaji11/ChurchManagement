"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, saveChurchWebsite, forgetWebsiteMedia, type WebsiteLayout,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";
import { t } from "@connectapp/i18n";
import { supabaseServer } from "@/lib/supabase/server";

export interface WebsiteResult {
  error?: string;
  saved?: boolean;
}

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

export async function saveWebsite(data: FormData): Promise<WebsiteResult> {
  const session = await requireSession();
  let sections: unknown;
  try {
    sections = JSON.parse(text(data, "sections"));
  } catch {
    return { error: t("website.error.sections") };
  }
  const input = {
    published: text(data, "published") === "true",
    layout: text(data, "layout") as WebsiteLayout,
    sections,
  };

  try {
    const context = {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    };
    const actor = {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    };
    const staleKeys = await withTenant(context, (tx) => saveChurchWebsite(tx, actor, input));
    if (staleKeys.length > 0) {
      const supabase = await supabaseServer();
      const removed = await supabase.storage.from("church").remove(staleKeys);
      if (removed.error) throw new Error(t("storage.error.failed"));
      await withTenant(context, (tx) => forgetWebsiteMedia(tx, actor, staleKeys));
    }
  } catch (error) {
    return { error: explain(error) };
  }

  revalidatePath("/website");
  revalidatePath("/");
  return { saved: true };
}
