"use client";

import * as React from "react";
import { DatePicker } from "@hearth/ui";
import { t } from "@hearth/i18n";

const LABELS = {
  open: t("date.open"),
  clear: t("date.clear"),
  previousMonth: t("date.previousMonth"),
  nextMonth: t("date.nextMonth"),
  month: t("date.month"),
  year: t("date.year"),
  today: t("date.today"),
};

/**
 * The date field, with its strings.
 *
 * `defaultValue` keeps it usable inside a plain form, which is how the person
 * form and the custom fields post. The value is held here and written to a
 * hidden input, so the server action reads it the same way it read the native
 * field.
 */
export function DateField({
  name,
  defaultValue,
  onValueChange,
  ...rest
}: {
  name: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const set = (next: string) => {
    setValue(next);
    onValueChange?.(next);
  };
  return (
    <DatePicker
      name={name}
      value={value}
      onChange={set}
      placeholder={t("date.placeholder")}
      labels={LABELS}
      {...rest}
    />
  );
}
