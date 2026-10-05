"use client";

import * as React from "react";
import {
  Banner, Button, Checkbox, Field, Input, RadioGroup, RadioItem, Textarea,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { visibleFields, type FormAnswer, type FormFieldDef } from "@hearth/db/rules";
import { DateField } from "@/components/date-field";
import { Empty } from "@/components/empty";
import { sendForm } from "./actions";

/**
 * R4.3. The form, as somebody with no account fills it in.
 *
 * Drawn with the same Field, Input and Button the rest of Hearth is drawn with,
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
}: {
  churchSlug: string;
  formSlug: string;
  name: string;
  intro: string | null;
  thanks: string | null;
  state: "open" | "closed" | "full";
  fields: FormFieldDef[];
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
          <Question
            key={field.id}
            field={field}
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

/** One question, drawn as the kind of answer it wants. */
function Question({
  field,
  value,
  error,
  onChange,
}: {
  field: FormFieldDef;
  value: FormAnswer;
  error?: string;
  onChange: (value: FormAnswer) => void;
}) {
  if (field.kind === "section") {
    return (
      <h2 className="mt-3 font-display text-heading text-fg">{field.label}</h2>
    );
  }

  const text = typeof value === "string" ? value : "";

  if (field.kind === "checkbox") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-center gap-2.5 text-[length:var(--d-text-body)] text-fg">
          <Checkbox
            checked={value === true}
            onCheckedChange={(next) => onChange(next === true)}
          />
          {field.label}
          {field.required ? <span className="text-danger-text">*</span> : null}
        </label>
        {field.help ? <span className="text-caption text-fg-muted">{field.help}</span> : null}
        {error ? <span className="text-caption text-danger-text">{error}</span> : null}
      </div>
    );
  }

  if (field.kind === "select") {
    return (
      <Field label={field.label} hint={field.help ?? undefined} error={error} required={field.required}>
        <RadioGroup value={text} onValueChange={onChange}>
          {(field.options ?? []).map((option) => (
            <RadioItem key={option} value={option}>
              {option}
            </RadioItem>
          ))}
        </RadioGroup>
      </Field>
    );
  }

  if (field.kind === "multi_select") {
    const chosen = Array.isArray(value) ? value : [];
    return (
      <Field label={field.label} hint={field.help ?? undefined} error={error} required={field.required}>
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2.5 text-[length:var(--d-text-body)] text-fg"
            >
              <Checkbox
                checked={chosen.includes(option)}
                onCheckedChange={(next) =>
                  onChange(
                    next === true
                      ? [...chosen, option]
                      : chosen.filter((one) => one !== option),
                  )}
              />
              {option}
            </label>
          ))}
        </div>
      </Field>
    );
  }

  if (field.kind === "date") {
    return (
      <Field label={field.label} hint={field.help ?? undefined} error={error} required={field.required}>
        <DateField name={`q-${field.id}`} defaultValue={text} onValueChange={onChange} />
      </Field>
    );
  }

  if (field.kind === "long_text") {
    return (
      <Field label={field.label} hint={field.help ?? undefined} error={error} required={field.required}>
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  const type =
    field.kind === "email" ? "email"
      : field.kind === "phone" ? "tel"
        : field.kind === "number" ? "number"
          : "text";

  return (
    <Field label={field.label} hint={field.help ?? undefined} error={error} required={field.required}>
      <Input
        type={type}
        inputMode={field.kind === "number" ? "decimal" : undefined}
        autoComplete={
          field.kind === "email" ? "email" : field.kind === "phone" ? "tel" : undefined
        }
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
