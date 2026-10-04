"use client";

import * as React from "react";
import { Combobox } from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * A field somebody may leave unanswered, and may unanswer again.
 *
 * A combobox rather than a select: it opens blank, it can be typed into when
 * the list is sixteen school years long, and it carries the cross that takes
 * the answer back off. A select has no empty value, so a marital status chosen
 * by mistake could never be undone.
 *
 * The chosen value rides a hidden input, so the form reads it with every other
 * field rather than the screen remembering to put it there.
 */
export function Picker({
  name,
  defaultValue,
  options,
  label,
  onChange,
}: {
  name: string;
  defaultValue: string | null;
  options: { value: string; label: string }[];
  label: string;
  /** Given where the screen changes with the answer. */
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Combobox
        options={options}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        placeholder={label}
        emptyLabel={t("church.noRegion")}
        clearLabel={t("date.clear")}
      />
    </>
  );
}
