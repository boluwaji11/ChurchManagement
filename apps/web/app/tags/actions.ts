"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, createTag, renameTag, setTagHue, deleteTag, mergeTags, setPersonTag,
  type TagHue,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface TagResult {
  error?: string;
  /** Set when a tag was created, so a picker can select it straight away. */
  id?: string;
}

async function context(slug: string | undefined) {
  const session = await requireSession(slug);
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return {
    session,
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

export async function addTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const name = field(data, "name");
  if (!name) return { error: t("error.enterName") };

  const { actor, ctx } = await context(slug);
  try {
    const tag = await withTenant(ctx, (tx) => createTag(tx, actor, { name }));
    revalidatePath("/tags");
    revalidatePath("/members");
    return { id: tag.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const id = field(data, "id");
  const name = field(data, "name");
  const hue = field(data, "hue") as TagHue;
  if (!id) return { error: t("error.notFound.tag") };
  if (!name) return { error: t("error.enterName") };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, async (tx) => {
      await renameTag(tx, actor, id, name);
      if (hue) await setTagHue(tx, actor, id, hue);
    });
    revalidatePath("/tags");
    revalidatePath("/members");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removeTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const id = field(data, "id");
  if (!id) return { error: t("error.notFound.tag") };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => deleteTag(tx, actor, id));
    revalidatePath("/tags");
    revalidatePath("/members");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function foldTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const fromId = field(data, "fromId");
  const intoId = field(data, "intoId");
  if (!fromId || !intoId) return { error: t("error.chooseMergeTarget") };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => mergeTags(tx, actor, { fromId, intoId }));
    revalidatePath("/tags");
    revalidatePath("/members");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** Applies or removes one tag on one person. */
export async function togglePersonTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const personId = field(data, "personId");
  const tagId = field(data, "tagId");
  const on = field(data, "on") === "1";
  if (!personId || !tagId) return { error: t("error.tagNotApplied") };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => setPersonTag(tx, actor, personId, tagId, on));
    revalidatePath(`/members/${personId}`);
    revalidatePath("/members");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** Creates a tag and puts it on a person, which is how most tags get made. */
export async function addTagToPerson(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const personId = field(data, "personId");
  const name = field(data, "name");
  if (!personId) return { error: t("error.tagNotApplied") };
  if (!name) return { error: t("error.enterName") };

  const { actor, ctx } = await context(slug);
  try {
    const id = await withTenant(ctx, async (tx) => {
      const tag = await createTag(tx, actor, { name });
      await setPersonTag(tx, actor, personId, tag.id, true);
      return tag.id;
    });
    revalidatePath(`/members/${personId}`);
    revalidatePath("/members");
    revalidatePath("/tags");
    return { id };
  } catch (error) {
    return { error: explain(error) };
  }
}
