"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, addService, setOccurrenceCancelled, removeSpecialService,
  updateOccurrence, stopRepeating,
} from "@hearth/db";
import { requireSession } from "@/lib/session";

import { explain } from "@/lib/explain";

export interface ServiceResult {
  error?: string;
  added?: number;
}

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

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

const done = () => {
  revalidatePath("/services");
};


export async function addGathering(data: FormData): Promise<ServiceResult> {
  const { session, ctx } = await writeContext(text(data, "church") || undefined);
  const actor = { tenantId: session.tenantId, role: session.role };

  try {
    const result = await withTenant(ctx, (tx) =>
      addService(tx, actor, {
        name: text(data, "name"),
        occursOn: text(data, "occursOn"),
        startsAt: text(data, "startsAt"),
        repeatsWeekly: text(data, "repeats") === "1",
      }),
    );
    done();
    return { added: result.created };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function stopRepeat(data: FormData): Promise<ServiceResult> {
  const { session, ctx } = await writeContext(text(data, "church") || undefined);
  const actor = { tenantId: session.tenantId, role: session.role };

  try {
    await withTenant(ctx, (tx) => stopRepeating(tx, actor, text(data, "serviceTimeId")));
    done();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function setCancelled(data: FormData): Promise<ServiceResult> {
  const { session, ctx } = await writeContext(text(data, "church") || undefined);
  const actor = { tenantId: session.tenantId, role: session.role };

  try {
    await withTenant(ctx, (tx) =>
      setOccurrenceCancelled(tx, actor, text(data, "id"), text(data, "cancelled") === "1", text(data, "note")),
    );
    done();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removeGathering(data: FormData): Promise<ServiceResult> {
  const { session, ctx } = await writeContext(text(data, "church") || undefined);
  const actor = { tenantId: session.tenantId, role: session.role };

  try {
    await withTenant(ctx, (tx) => removeSpecialService(tx, actor, text(data, "id")));
    done();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function editGathering(data: FormData): Promise<ServiceResult> {
  const { session, ctx } = await writeContext(text(data, "church") || undefined);
  const actor = { tenantId: session.tenantId, role: session.role };

  try {
    await withTenant(ctx, (tx) =>
      updateOccurrence(tx, actor, text(data, "id"), {
        name: text(data, "name"),
        occursOn: text(data, "occursOn"),
        startsAt: text(data, "startsAt"),
        note: text(data, "note"),
      }),
    );
    done();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

