"use client";

import * as React from "react";
import { TimePicker } from "@hearth/ui";
import { t } from "@hearth/i18n";

const LABELS = { open: t("time.open"), clear: t("time.clear") };

/** The time field, with its strings. Holds its own value for a plain form. */
export function TimeField({
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
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const set = (next: string) => {
    setValue(next);
    onValueChange?.(next);
  };
  return (
    <TimePicker
      name={name}
      value={value}
      onChange={set}
      labels={LABELS}
      {...rest}
    />
  );
}
