"use client";

import * as React from "react";
import { Input, Field, Checkbox } from "@connectapp/ui";
import { Picker } from "@/components/picker";
import { MultiSelect } from "@/components/multi-select";
import { DateField } from "@/components/date-field";
import { t } from "@connectapp/i18n";
import type { FieldDef } from "./field-values";

export type { FieldDef };

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
  /*
   * R24.6. No wrapper of its own.
   *
   * A church's own field is a field on the form like any other, so it takes
   * its place in whatever grid the form is already laying out. A grid in
   * here made a second, narrower one inside the first, and the fields read
   * as a box bolted to the bottom of the screen.
   */
  return (
    <>
      {fields.map((field) => (
        <CustomFieldInput
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors[`cf_${field.id}`]}
        />
      ))}
    </>
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
          <DateField name={name} defaultValue={typeof value === "string" ? value : ""} />
        </Field>
      );

    /*
     * R1.10, R24.6. The same control a field the product ships with uses.
     *
     * A church's own field is a field like any other, so it opens the way
     * marital status opens and carries the same cross for taking an answer
     * back off. A bare select had no empty value, so a choice made by
     * mistake could not be undone.
     */
    case "select":
      return (
        <Field label={field.label} error={error}>
          <Picker
            name={name}
            defaultValue={typeof value === "string" ? value : null}
            options={options.map((one) => ({ value: one, label: one }))}
            label={field.label}
          />
        </Field>
      );

    /* R1.10, R24.6. The control the rest of the product uses for "any of
       these", rather than a row of loose boxes that grows off the form. */
    case "multi_select":
      return (
        <Field label={field.label} error={error}>
          <ManyOf
            name={name}
            label={field.label}
            options={options}
            chosen={Array.isArray(value) ? (value as string[]) : []}
          />
        </Field>
      );

    default:
      return (
        <Field label={field.label} error={error}>
          <Input name={name} defaultValue={typeof value === "string" ? value : ""} autoComplete="off" />
        </Field>
      );
  }
}

/**
 * Several of a field's choices, with the answers riding hidden inputs.
 *
 * The form reads them with `getAll`, the same way it read the row of
 * checkboxes this replaced, so nothing on the server had to change.
 */
function ManyOf({
  name,
  label,
  options,
  chosen,
}: {
  name: string;
  label: string;
  options: string[];
  chosen: string[];
}) {
  const [picked, setPicked] = React.useState(chosen);

  return (
    <>
      {picked.map((one) => (
        <input key={one} type="hidden" name={name} value={one} />
      ))}
      <MultiSelect
        label={label}
        options={options.map((one) => ({ value: one, label: one }))}
        value={picked}
        onChange={setPicked}
        summary={(picks) =>
          picks.length > 2
            ? t("find.chosen", { count: picks.length })
            : picks.map((one) => one.label).join(", ")
        }
      />
    </>
  );
}
