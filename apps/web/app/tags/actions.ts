"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, createTag, renameTag, setTagHue, deleteTag, mergeTags, setPersonTag,
  PermissionError, NameTakenError, type TagHue,
} from "@hearth/db";
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

/**
 * Turns a thrown error into a sentence.
 *
 * A refused permission and a duplicate name are both expected outcomes, not
 * faults, so they come back as text the form can show. Anything else is a real
 * fault and is rethrown, because swallowing it would hide a bug behind a message
 * that reads like a rule.
 */
function explain(error: unknown): TagResult {
  if (error instanceof PermissionError) return { error: error.message };
  if (error instanceof NameTakenError) return { error: error.message };
  throw error;
}

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function addTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const name = field(data, "name");
  if (!name) return { error: "Enter a name." };

  const { actor, ctx } = await context(slug);
  try {
    const tag = await withTenant(ctx, (tx) => createTag(tx, actor, { name }));
    revalidatePath("/tags");
    revalidatePath("/people");
    return { id: tag.id };
  } catch (error) {
    return explain(error);
  }
}

export async function saveTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const id = field(data, "id");
  const name = field(data, "name");
  const hue = field(data, "hue") as TagHue;
  if (!id) return { error: "That tag could not be found. Reload and try again." };
  if (!name) return { error: "Enter a name." };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, async (tx) => {
      await renameTag(tx, actor, id, name);
      if (hue) await setTagHue(tx, actor, id, hue);
    });
    revalidatePath("/tags");
    revalidatePath("/people");
    return {};
  } catch (error) {
    return explain(error);
  }
}

export async function removeTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const id = field(data, "id");
  if (!id) return { error: "That tag could not be found. Reload and try again." };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => deleteTag(tx, actor, id));
    revalidatePath("/tags");
    revalidatePath("/people");
    return {};
  } catch (error) {
    return explain(error);
  }
}

export async function foldTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const fromId = field(data, "fromId");
  const intoId = field(data, "intoId");
  if (!fromId || !intoId) return { error: "Choose a tag to merge into." };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => mergeTags(tx, actor, { fromId, intoId }));
    revalidatePath("/tags");
    revalidatePath("/people");
    return {};
  } catch (error) {
    return explain(error);
  }
}

/** Applies or removes one tag on one person. */
export async function togglePersonTag(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const personId = field(data, "personId");
  const tagId = field(data, "tagId");
  const on = field(data, "on") === "1";
  if (!personId || !tagId) return { error: "That tag could not be applied. Reload and try again." };

  const { actor, ctx } = await context(slug);
  try {
    await withTenant(ctx, (tx) => setPersonTag(tx, actor, personId, tagId, on));
    revalidatePath(`/people/${personId}`);
    revalidatePath("/people");
    return {};
  } catch (error) {
    return explain(error);
  }
}

/** Creates a tag and puts it on a person, which is how most tags get made. */
export async function addTagToPerson(data: FormData): Promise<TagResult> {
  const slug = field(data, "church") || undefined;
  const personId = field(data, "personId");
  const name = field(data, "name");
  if (!personId) return { error: "That tag could not be applied. Reload and try again." };
  if (!name) return { error: "Enter a name." };

  const { actor, ctx } = await context(slug);
  try {
    const id = await withTenant(ctx, async (tx) => {
      const tag = await createTag(tx, actor, { name });
      await setPersonTag(tx, actor, personId, tag.id, true);
      return tag.id;
    });
    revalidatePath(`/people/${personId}`);
    revalidatePath("/people");
    revalidatePath("/tags");
    return { id };
  } catch (error) {
    return explain(error);
  }
}
