"use client";

import * as React from "react";
import { TimePicker } from "@hearth/ui";
import { t } from "@hearth/i18n";

const LABELS = { open: t("time.open"), clear: t("time.clear") };

/** The time field, with its strings. Holds its own value for a plain form. */
export function TimeField({
  name,
  defaultValue,
  ...rest
}: {
  name: string;
  defaultValue?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  return (
    <TimePicker
      name={name}
      value={value}
      onChange={setValue}
      placeholder={t("time.placeholder")}
      labels={LABELS}
      {...rest}
    />
  );
}
