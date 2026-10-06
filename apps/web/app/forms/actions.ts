"use server";

import {
  withTenant, createForm, updateForm, setFormStatus, setFormArchived,
  addFormField, updateFormField, removeFormField, moveFormField, reorderFormFields,
  getForm, placeUnplacedForTenant, canManageChurch, setFormCover, setFormHue, templateFor,
  type FormInput, type FormFieldInput, type FormStatus,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
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
  /** R24.6. Its readable address, for where to go once it exists. */
  slug?: string;
}

/**
 * R4.1. A new form, with the question every form starts with already on it.
 *
 * An empty builder is a blank page, and the first question is the same one on
 * nearly every form a church writes. Writing over it is quicker than deciding
 * what goes first.
 */
export async function newForm(
  input: FormInput,
  church?: string,
  template?: string,
): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  const from = template ? templateFor(template) : undefined;

  try {
    const made = await withTenant(ctx, async (tx) => {
      const form = await createForm(tx, actor, {
        ...input,
        ...(from ? { name: t(from.name), intro: t(from.intro), hue: from.hue } : {}),
      });

      /*
       * R4.8. A template arrives written, with every question that can name
       * part of a person's record already pointed at it. A church's first form
       * then writes to the directory without anybody opening a picker, which
       * is the whole of R4.4.
       */
      const questions = from
        ? from.questions.map((one) => ({
            kind: one.kind,
            label: t(one.label),
            required: one.required ?? false,
            options: one.options ? one.options.map((option) => t(option)) : null,
            mapsTo: one.mapsTo ?? null,
          }))
        : [{ kind: "text" as const, label: t("form.firstQuestion"), required: true }];

      for (const question of questions) {
        await addFormField(tx, actor, form.id, question);
      }
      return form;
    });
    return { id: made.id, slug: made.slug };
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
 * Permission is checked here and the pass itself is carried out in the data
 * layer, which chooses its own connection: it writes members records on behalf
 * of a form rather than on behalf of the person pressing the button, which is
 * the path a public submission already takes.
 */
export async function matchResponses(
  formId: string,
  church?: string,
): Promise<FormResult & { placed?: number; waiting?: number }> {
  const { actor, ctx } = await context(church);
  if (!canManageChurch(actor.role)) return { error: t("forbidden.denied") };

  try {
    const form = await withTenant(ctx, (tx) => getForm(tx, formId));
    if (!form) return { error: t("form.error.missing") };

    const result = await placeUnplacedForTenant({
      tenantId: actor.tenantId,
      formId,
      fields: form.fields,
    });
    return result;
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R4.1. Takes the picture off a form. Putting one on goes through the upload route. */
export async function clearFormCover(formId: string, church?: string): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setFormCover(tx, actor, formId, null));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R24.4. The colour a form wears, changed on one press of a swatch. */
export async function recolourForm(
  formId: string,
  hue: string,
  church?: string,
): Promise<FormResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setFormHue(tx, actor, formId, hue));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
