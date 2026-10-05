"use server";

import {
  withTenant, createForm, updateForm, setFormStatus, setFormArchived,
  addFormField, updateFormField, removeFormField, moveFormField, reorderFormFields,
  getForm, placeUnplaced, owner, canManageChurch,
  type FormInput, type FormFieldInput, type FormStatus,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context(church?: string) {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };
  return { actor, ctx: actor };
}

export interface FormResult {
  error?: string;
  id?: string;
}

/**
 * R4.1. A new form, with the question every form starts with already on it.
 *
 * An empty builder is a blank page, and the first question is the same one on
 * nearly every form a church writes. Writing over it is quicker than deciding
 * what goes first.
 */
export async function newForm(input: FormInput, church?: string): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    const made = await withTenant(ctx, async (tx) => {
      const form = await createForm(tx, actor, input);
      await addFormField(tx, actor, form.id, {
        kind: "text",
        label: t("form.firstQuestion"),
        required: true,
      });
      return form;
    });
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

/** R4.1. The order the questions were dragged into. */
export async function orderQuestions(
  formId: string,
  ids: string[],
  church?: string,
): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => reorderFormFields(tx, actor, formId, ids));
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

/**
 * R4.4. Matches the answers already in, after the questions have been pointed
 * at the record.
 *
 * A church collects a term's worth of responses and only then notices the
 * picker, so the work has to be runnable over what is already there. Only
 * submissions that landed nowhere are touched.
 *
 * Permission is checked here and the pass itself runs on the owner connection,
 * because it writes people records on behalf of a form rather than on behalf of
 * the person pressing the button, which is the same path a public submission
 * takes.
 */
export async function matchResponses(
  formId: string,
  church?: string,
): Promise<FormResult & { placed?: number; waiting?: number }> {
  const { actor, ctx } = await context(church);
  if (!canManageChurch(actor.role)) return { error: t("forbidden.askAdmin") };

  try {
    const form = await withTenant(ctx, (tx) => getForm(tx, formId));
    if (!form) return { error: t("form.error.missing") };

    const result = await placeUnplaced(owner(), {
      tenantId: actor.tenantId,
      formId,
      fields: form.fields,
    });
    return result;
  } catch (error) {
    return { error: explain(error) };
  }
}
