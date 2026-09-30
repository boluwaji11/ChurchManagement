"use client";

import * as React from "react";
import {
  Input, Field, Checkbox,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";

export interface FieldDef {
  id: string;
  label: string;
  type: string;
  options: string[] | null;
}

export type FieldValues = Record<string, unknown>;

/**
 * Renders whatever the church decided a person needs.
 *
 * Every input is named `cf_<id>`, so the server reads them by definition rather
 * than by guessing at the shape of the form. A checkbox that is off sends
 * nothing, which is why booleans are read from presence on the other side.
 */
export function CustomFieldInputs({
  fields,
  values,
  errors,
}: {
  fields: FieldDef[];
  values: FieldValues;
  errors: Record<string, string | undefined>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <CustomFieldInput
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors[`cf_${field.id}`]}
        />
      ))}
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  error,
}: {
  field: FieldDef;
  value: unknown;
  error?: string;
}) {
  const name = `cf_${field.id}`;
  const options = field.options ?? [];

  switch (field.type) {
    case "boolean":
      return (
        <label className="flex items-center gap-2.5 py-1.5">
          <Checkbox name={name} value="1" defaultChecked={value === true} />
          <span className="text-label text-fg">{field.label}</span>
        </label>
      );

    case "number":
      return (
        <Field label={field.label} error={error}>
          <Input name={name} type="number" step="any" defaultValue={value === null || value === undefined ? "" : String(value)} />
        </Field>
      );

    case "date":
      return (
        <Field label={field.label} error={error}>
          <Input name={name} type="date" defaultValue={typeof value === "string" ? value : ""} />
        </Field>
      );

    case "select":
      return (
        <Field label={field.label} error={error}>
          <Select name={name} defaultValue={typeof value === "string" ? value : ""}>
            <SelectTrigger>
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );

    case "multi_select": {
      const chosen = new Set(Array.isArray(value) ? (value as string[]) : []);
      return (
        <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
          <legend className="text-label text-fg">{field.label}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {options.map((o) => (
              <label key={o} className="flex items-center gap-2">
                <Checkbox name={name} value={o} defaultChecked={chosen.has(o)} />
                <span className="text-[length:var(--d-text-body)] text-fg">{o}</span>
              </label>
            ))}
          </div>
          {error ? (
            <p role="alert" className="text-caption text-danger-text">{error}</p>
          ) : null}
        </fieldset>
      );
    }

    default:
      return (
        <Field label={field.label} error={error}>
          <Input name={name} defaultValue={typeof value === "string" ? value : ""} autoComplete="off" />
        </Field>
      );
  }
}
