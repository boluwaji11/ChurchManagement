"use client";

import * as React from "react";
import { Checkbox, Field, Input, RadioGroup, RadioItem, Textarea } from "@hearth/ui";
import type { FormAnswer, FormFieldDef } from "@hearth/db/rules";
import { DateField } from "@/components/date-field";
import { FileAnswer } from "@/components/file-answer";

/** One question, drawn as the kind of answer it wants. */
export function Answer({
  field,
  value,
  error,
  onChange,
  churchSlug,
  formSlug,
}: {
  field: FormFieldDef;
  value: FormAnswer;
  error?: string;
  onChange: (value: FormAnswer) => void;
  /** R4.1. Where a file question sends its bytes. Absent means it cannot. */
  churchSlug?: string;
  formSlug?: string;
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

  if (field.kind === "file") {
    if (!churchSlug || !formSlug) return null;
    return (
      <Field label={field.label} hint={field.help ?? undefined} error={error} required={field.required}>
        <FileAnswer
          field={field}
          churchSlug={churchSlug}
          formSlug={formSlug}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
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
