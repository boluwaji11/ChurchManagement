"use server";

import { submitPublicForm } from "@hearth/db";
import type { FormAnswer } from "@hearth/db/rules";
import { explain } from "@/lib/explain";

/**
 * R4.3, R4.9. Sending an answered form in from the open web.
 *
 * `trap` is a field positioned off the screen and hidden from a screen reader.
 * A person never sees it, so a person never fills it in, and the robots that
 * walk a page filling every input it has fill it every time. Answering with a
 * thank you rather than an error means a robot cannot tell it tripped.
 */
export async function sendForm(input: {
  churchSlug: string;
  formSlug: string;
  answers: Record<string, FormAnswer>;
  trap: string;
}): Promise<{ ok: boolean; errors?: Record<string, string>; error?: string }> {
  if (input.trap.trim() !== "") return { ok: true };

  try {
    const result = await submitPublicForm({
      churchSlug: input.churchSlug,
      formSlug: input.formSlug,
      answers: input.answers,
    });
    return result.ok ? { ok: true } : { ok: false, errors: result.errors };
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
}
