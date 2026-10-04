"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { withTenant, addRoom, updateRoom, setRoomArchived, orderRooms } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface RoomResult {
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

/** An empty box means the church has not said, which is different from a zero. */
const number = (data: FormData, key: string): number | null => {
  const raw = field(data, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
};

const input = (data: FormData) => ({
  name: field(data, "name"),
  hue: field(data, "hue") || "sky",
  minAgeMonths: number(data, "minAgeMonths"),
  maxAgeMonths: number(data, "maxAgeMonths"),
  capacity: number(data, "capacity"),
  ratio: number(data, "ratio"),
  forChildren: field(data, "forChildren") === "1",
});

export async function createRoom(data: FormData): Promise<RoomResult> {
  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    await withTenant(ctx, (tx) => addRoom(tx, actor, input(data)));
    revalidatePath("/settings/rooms");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveRoom(data: FormData): Promise<RoomResult> {
  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    await withTenant(ctx, (tx) => updateRoom(tx, actor, field(data, "id"), input(data)));
    revalidatePath("/settings/rooms");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archiveRoom(data: FormData): Promise<RoomResult> {
  const { actor, ctx } = await context(field(data, "church") || undefined);
  try {
    await withTenant(ctx, (tx) =>
      setRoomArchived(tx, actor, field(data, "id"), field(data, "archived") === "1"),
    );
    revalidatePath("/settings/rooms");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function moveRoom(data: FormData): Promise<RoomResult> {
  const { actor, ctx } = await context(field(data, "church") || undefined);
  const ids = field(data, "ids").split(",").filter(Boolean);
  try {
    await withTenant(ctx, (tx) => orderRooms(tx, actor, ids));
    revalidatePath("/settings/rooms");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
