"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, addService, setOccurrenceCancelled, updateOccurrence, stopRepeating,
  setHeadcount, isFrequency,
} from "@connectapp/db";
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
  const repeat = text(data, "repeat");

  try {
    const result = await withTenant(ctx, (tx) =>
      addService(tx, actor, {
        name: text(data, "name"),
        occursOn: text(data, "occursOn"),
        startsAt: text(data, "startsAt"),
        frequency: repeat && isFrequency(repeat) ? repeat : undefined,
        untilOn: text(data, "untilOn") || null,
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

export async function recordHeadcount(data: FormData): Promise<ServiceResult> {
  const { session, ctx } = await writeContext(text(data, "church") || undefined);
  const actor = { tenantId: session.tenantId, role: session.role };

  // A blank field is nobody counted. A zero is nobody came. They are different
  // facts, so an empty string becomes null rather than 0.
  const number = (key: string) => {
    const raw = text(data, key).trim();
    return raw === "" ? null : Number(raw);
  };

  try {
    await withTenant(ctx, (tx) =>
      setHeadcount(tx, actor, text(data, "id"), {
        adults: number("adults"),
        children: number("children"),
        visitors: number("visitors"),
        note: text(data, "note"),
      }),
    );
    done();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
