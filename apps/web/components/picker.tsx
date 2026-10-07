"use client";

import * as React from "react";
import { Combobox, SelectCreate } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

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
  clearable = true,
  create,
}: {
  name: string;
  defaultValue: string | null;
  options: { value: string; label: string }[];
  label: string;
  /** Given where the screen changes with the answer. */
  onChange?: (value: string) => void;
  /** False where the field has to hold one of its answers at all times. */
  clearable?: boolean;
  /**
   * R24.6. Where this list is kept, for when the answer is not in it.
   *
   * Given on a field whose options a church configures, so somebody short of a
   * group type or a room has the way to add one in front of them.
   */
  create?: { href: string; label: string };
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Combobox
        options={options}
        clearable={clearable}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        placeholder={label}
        emptyLabel={t("common.noMatch")}
        clearLabel={t("date.clear")}
        footer={create ? <SelectCreate href={create.href}>{create.label}</SelectCreate> : undefined}
      />
    </>
  );
}
