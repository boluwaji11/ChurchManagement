"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, updateChurch, addServiceTime, removeServiceTime, setChurchLogo,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";

export interface SettingsResult {
  error?: string;
  saved?: boolean;
}

async function writeContext(slug: string | undefined) {
  const session = await requireSession(slug);
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    session,
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    },
  };
}

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

export async function saveChurch(data: FormData): Promise<SettingsResult> {
  const slug = text(data, "church") || undefined;
  const { session, ctx } = await writeContext(slug);

  try {
    await withTenant(ctx, (tx) =>
      updateChurch(tx, { tenantId: session.tenantId, role: session.role }, {
        name: text(data, "name"),
        legalName: text(data, "legalName"),
        timezone: text(data, "timezone"),
        addressLine1: text(data, "addressLine1"),
        addressLine2: text(data, "addressLine2"),
        city: text(data, "city"),
        region: text(data, "region"),
        postalCode: text(data, "postalCode"),
        country: text(data, "country") || "US",
        phone: text(data, "phone"),
        email: text(data, "email"),
        website: text(data, "website"),
      }),
    );
  } catch (error) {
    return { error: explain(error) };
  }

  revalidatePath("/settings");
  revalidatePath("/members");
  return { saved: true };
}

export async function addService(data: FormData): Promise<SettingsResult> {
  const slug = text(data, "church") || undefined;
  const { session, ctx } = await writeContext(slug);

  const day = Number(text(data, "dayOfWeek"));
  if (!Number.isInteger(day)) return { error: t("church.error.serviceDay") };

  try {
    await withTenant(ctx, (tx) =>
      addServiceTime(tx, { tenantId: session.tenantId, role: session.role }, {
        name: text(data, "name"),
        dayOfWeek: day,
        startsAt: text(data, "startsAt"),
      }),
    );
  } catch (error) {
    return { error: explain(error) };
  }

  revalidatePath("/settings");
  return { saved: true };
}

export async function removeService(data: FormData): Promise<SettingsResult> {
  const slug = text(data, "church") || undefined;
  const { session, ctx } = await writeContext(slug);

  try {
    await withTenant(ctx, (tx) =>
      removeServiceTime(tx, { tenantId: session.tenantId, role: session.role }, text(data, "id")),
    );
  } catch (error) {
    return { error: explain(error) };
  }

  revalidatePath("/settings");
  return { saved: true };
}

export async function clearLogo(data: FormData): Promise<SettingsResult> {
  const slug = text(data, "church") || undefined;
  const { session, ctx } = await writeContext(slug);

  try {
    const { removed } = await withTenant(ctx, (tx) =>
      setChurchLogo(tx, { tenantId: session.tenantId, role: session.role }, null),
    );
    if (removed) {
      const supabase = await supabaseServer();
      await supabase.storage.from("church").remove([removed]);
    }
  } catch (error) {
    return { error: explain(error) };
  }

  revalidatePath("/settings");
  return { saved: true };
}
