"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { withTenant, addStation, updateStation, setStationArchived } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface StationResult {
  error?: string;
}

async function context(slug: string | undefined) {
  const session = await requireSession(slug);
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    actor: { tenantId: session.tenantId, role: session.role },
    ctx: {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    },
  };
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const ids = (data: FormData, key: string) => field(data, key).split(",").filter(Boolean);

const input = (data: FormData) => ({
  name: field(data, "name"),
  mode: field(data, "mode") || "desk",
  printer: field(data, "printer") || "paper",
  roomIds: ids(data, "roomIds"),
  serviceTimeIds: ids(data, "serviceTimeIds"),
});

export async function createStation(data: FormData): Promise<StationResult> {
  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    await withTenant(ctx, (tx) => addStation(tx, actor, input(data)));
    revalidatePath("/settings/stations");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveStation(data: FormData): Promise<StationResult> {
  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    await withTenant(ctx, (tx) => updateStation(tx, actor, field(data, "id"), input(data)));
    revalidatePath("/settings/stations");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archiveStation(data: FormData): Promise<StationResult> {
  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    await withTenant(ctx, (tx) =>
      setStationArchived(tx, actor, field(data, "id"), field(data, "archived") === "1"),
    );
    revalidatePath("/settings/stations");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
