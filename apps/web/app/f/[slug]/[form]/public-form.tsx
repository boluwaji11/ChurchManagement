"use client";

import * as React from "react";
import { Banner, Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { visibleFields, type FormAnswer, type FormFieldDef } from "@connectapp/db/rules";
import { Empty } from "@/components/empty";
import { Answer } from "@/components/form-answer";
import { sendForm } from "./actions";

/**
 * R4.3. The form, as somebody with no account fills it in.
 *
 * Drawn with the same Field, Input and Button the rest of ConnectApp is drawn with,
 * because this is the one screen a church shows the open web and a second-rate
 * version of the product is worse than none. Conditions (R4.2) are resolved
 * here as the answers change, so a follow-up question appears under the answer
 * that asked for it rather than after a round trip.
 */
export function PublicForm({
  churchSlug,
  formSlug,
  name,
  intro,
  thanks,
  state,
  fields,
  eventSlug,
}: {
  churchSlug: string;
  formSlug: string;
  name: string;
  intro: string | null;
  thanks: string | null;
  state: "open" | "closed" | "full";
  fields: FormFieldDef[];
  /** R14.2. The event this was reached from, so the answer takes a place at it. */
  eventSlug?: string | null;
}) {
  const [answers, setAnswers] = React.useState<Record<string, FormAnswer>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [failed, setFailed] = React.useState<string>();
  const [sent, setSent] = React.useState(false);
  const [sending, startTransition] = React.useTransition();
  const trap = React.useRef<HTMLInputElement>(null);

  const shown = visibleFields(fields, answers);

  const set = (id: string, value: FormAnswer) => {
    setAnswers((was) => ({ ...was, [id]: value }));
    // The message goes the moment they start putting it right, rather than
    // sitting under a field they have already corrected.
    setErrors((was) => (was[id] ? { ...was, [id]: "" } : was));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFailed(undefined);
    startTransition(async () => {
      const result = await sendForm({
        churchSlug,
        formSlug,
        answers,
        trap: trap.current?.value ?? "",
        eventSlug,
      });
      if (result.ok) {
        setSent(true);
        return;
      }
      setErrors(result.errors ?? {});
      setFailed(result.error);
    });
  };

  if (sent) {
    return (
      <Empty
        icon="form"
        title={thanks?.trim() || t("publicForm.sent")}
        className="py-6"
      />
    );
  }

  if (state !== "open") {
    return (
      <Empty
        icon="form"
        title={state === "full" ? t("publicForm.full") : t("publicForm.closed")}
        className="py-6"
      />
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6" aria-busy={sending}>
      {/* The title, then a hairline, so the questions read as a block rather
          than as the fourth and fifth lines of the heading. */}
      <div className="flex flex-col gap-2.5 border-b border-line pb-6">
        <h1 className="font-display text-[28px] leading-[34px] text-fg sm:text-[32px] sm:leading-[38px]">
          {name}
        </h1>
        {intro ? (
          <p className="text-[length:var(--d-text-body)] leading-6 text-fg-muted">{intro}</p>
        ) : null}
      </div>

      {failed ? <Banner tone="danger" title={t("publicForm.failed")}>{failed}</Banner> : null}

      <div className="flex flex-col gap-6">
        {shown.map((field) => (
          <Answer
            key={field.id}
            field={field}
            churchSlug={churchSlug}
            formSlug={formSlug}
            value={answers[field.id] ?? null}
            error={errors[field.id] ? t(errors[field.id] as never) : undefined}
            onChange={(value) => set(field.id, value)}
          />
        ))}
      </div>

      {/* R4.9. Off the screen and out of the accessibility tree, so only a
          robot walking the markup ever finds it. */}
      <input
        ref={trap}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] size-px opacity-0"
      />

      {/* Full width on a phone, where a form is most often filled in, and the
          natural width of its words on anything larger. */}
      <Button
        type="submit"
        disabled={sending}
        className="mt-1 w-full sm:w-auto sm:min-w-[160px] sm:self-start"
      >
        {sending ? t("publicForm.sending") : t("form.send")}
      </Button>
    </form>
  );
}
