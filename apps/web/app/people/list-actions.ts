"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, createStaticList, createRuleList, renameList, setListArchived,
  addToList, removeFromList, cleanRule, canEditPeople,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

export interface ListResult {
  error?: string;
  id?: string;
  count?: number;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

async function allowed(church?: string) {
  const session = await requireSession(church);
  if (!canEditPeople(session.role)) throw new Error(t("forbidden.addPeople"));
  return session;
}

/** R1.14. The people on screen right now, kept as a list. */
export async function saveSelection(data: FormData): Promise<ListResult> {
  try {
    const session = await allowed(field(data, "church") || undefined);
    const ids = data.getAll("ids").map(String).filter(Boolean);
    const existing = field(data, "listId");

    const result = await withTenant(session, async (tx) => {
      if (existing) {
        return { id: existing, count: await addToList(tx, session, { listId: existing, personIds: ids }) };
      }
      const made = await createStaticList(tx, session, { name: field(data, "name"), personIds: ids });
      return { id: made.id, count: made.added };
    });

    revalidatePath("/people");
    return result;
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.14. The filters on screen right now, kept as a list that answers itself. */
export async function saveView(data: FormData): Promise<ListResult> {
  try {
    const session = await allowed(field(data, "church") || undefined);
    const rule = cleanRule({
      q: field(data, "q"),
      status: field(data, "status"),
      tag: field(data, "tag"),
      has: field(data, "has"),
      show: field(data, "show"),
    });

    const made = await withTenant(session, (tx) =>
      createRuleList(tx, session, { name: field(data, "name"), rule }),
    );

    revalidatePath("/people");
    return { id: made.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function rename(id: string, name: string, church?: string): Promise<ListResult> {
  try {
    const session = await allowed(church);
    await withTenant(session, (tx) => renameList(tx, session, { id, name }));
    revalidatePath("/people");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archiveList(id: string, archived: boolean, church?: string): Promise<ListResult> {
  try {
    const session = await allowed(church);
    await withTenant(session, (tx) => setListArchived(tx, session, { id, archived }));
    revalidatePath("/people");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.14. Taking people off a list. Their records are untouched. */
export async function takeOffList(data: FormData): Promise<ListResult> {
  try {
    const session = await allowed(field(data, "church") || undefined);
    const ids = data.getAll("ids").map(String).filter(Boolean);
    const count = await withTenant(session, (tx) =>
      removeFromList(tx, session, { listId: field(data, "listId"), personIds: ids }),
    );
    revalidatePath("/people");
    return { count };
  } catch (error) {
    return { error: explain(error) };
  }
}
