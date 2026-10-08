"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, createCustomField, updateCustomField, deleteCustomField,
  type CustomFieldType,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";
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


const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const choices = (data: FormData) =>
  field(data, "options")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

function done() {
  revalidatePath("/fields");
  revalidatePath("/members");
}

export async function addField(data: FormData): Promise<FieldResult> {
  const slug = field(data, "church") || undefined;
  const label = field(data, "label");
  const type = field(data, "type") as CustomFieldType;
  if (!label) return { error: t("error.enterName") };
  if (!type) return { error: t("error.chooseType") };

  const { actor, ctx } = await context(slug);
  try {
    const made = await withTenant(ctx, (tx) =>
      createCustomField(tx, actor, {
        entity: "person",
        label,
        type,
        options: choices(data),
        memberEditable: data.get("memberEditable") !== null,
      }),
    );
    done();
    return { id: made.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveField(data: FormData): Promise<FieldResult> {
  const slug = field(data, "church") || undefined;
  const id = field(data, "id");
  const label = field(data, "label");
  if (!id) return { error: t("error.notFound.field") };
  if (!label) return { error: t("error.enterName") };

  const { actor, ctx } = await context(slug);
  try {
    const type = field(data, "type");
    await withTenant(ctx, (tx) =>
      updateCustomField(tx, actor, id, {
        label,
        options: choices(data),
        // R1.10. Only honoured while nothing has been answered against it.
        type: (type || undefined) as CustomFieldType | undefined,
        memberEditable: data.get("memberEditable") !== null,
      }),
    );
    done();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removeField(data: FormData): Promise<FieldResult> {
  const slug = field(data, "church") || undefined;
  const id = field(data, "id");
  if (!id) return { error: t("error.notFound.field") };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => deleteCustomField(tx, actor, id));
    done();
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
