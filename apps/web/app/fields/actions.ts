"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, createCustomField, updateCustomField, deleteCustomField,
  PermissionError, NameTakenError, InvalidInputError, type CustomFieldType,
} from "@hearth/db";
import { requireSession } from "@/lib/session";

export interface FieldResult {
  error?: string;
  id?: string;
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

function explain(error: unknown): FieldResult {
  if (error instanceof PermissionError) return { error: error.message };
  if (error instanceof NameTakenError) return { error: error.message };
  if (error instanceof InvalidInputError) return { error: error.message };
  throw error;
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const choices = (data: FormData) =>
  field(data, "options")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

function done() {
  revalidatePath("/fields");
  revalidatePath("/people");
}

export async function addField(data: FormData): Promise<FieldResult> {
  const slug = field(data, "church") || undefined;
  const label = field(data, "label");
  const type = field(data, "type") as CustomFieldType;
  if (!label) return { error: "Enter a name." };
  if (!type) return { error: "Choose a type." };

  const { actor, ctx } = await context(slug);
  try {
    const made = await withTenant(ctx, (tx) =>
      createCustomField(tx, actor, { entity: "person", label, type, options: choices(data) }),
    );
    done();
    return { id: made.id };
  } catch (error) {
    return explain(error);
  }
}

export async function saveField(data: FormData): Promise<FieldResult> {
  const slug = field(data, "church") || undefined;
  const id = field(data, "id");
  const label = field(data, "label");
  if (!id) return { error: "That field could not be found. Reload and try again." };
  if (!label) return { error: "Enter a name." };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => updateCustomField(tx, actor, id, { label, options: choices(data) }));
    done();
    return {};
  } catch (error) {
    return explain(error);
  }
}

export async function removeField(data: FormData): Promise<FieldResult> {
  const slug = field(data, "church") || undefined;
  const id = field(data, "id");
  if (!id) return { error: "That field could not be found. Reload and try again." };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => deleteCustomField(tx, actor, id));
    done();
    return {};
  } catch (error) {
    return explain(error);
  }
}
