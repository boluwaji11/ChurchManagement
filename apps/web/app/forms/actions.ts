"use server";

import {
  withTenant, createForm, updateForm, setFormStatus, setFormArchived,
  addFormField, updateFormField, removeFormField, moveFormField,
  type FormInput, type FormFieldInput, type FormStatus,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context(church?: string) {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  return { actor, ctx: actor };
}

export interface FormResult {
  error?: string;
  id?: string;
}

export async function newForm(input: FormInput, church?: string): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    const made = await withTenant(ctx, (tx) => createForm(tx, actor, input));
    return { id: made.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveForm(
  id: string,
  input: FormInput,
  church?: string,
): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => updateForm(tx, actor, id, input));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R4.1. Opening is refused while anything would make the form unanswerable. */
export async function openOrClose(
  id: string,
  status: FormStatus,
  church?: string,
): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setFormStatus(tx, actor, id, status));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archiveForm(
  id: string,
  archived: boolean,
  church?: string,
): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setFormArchived(tx, actor, id, archived));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveQuestion(
  formId: string,
  id: string | null,
  input: FormFieldInput,
  church?: string,
): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, async (tx) => {
      if (id) await updateFormField(tx, actor, id, input);
      else await addFormField(tx, actor, formId, input);
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropQuestion(id: string, church?: string): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeFormField(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function shiftQuestion(
  formId: string,
  id: string,
  direction: "up" | "down",
  church?: string,
): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => moveFormField(tx, actor, { formId, id, direction }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
