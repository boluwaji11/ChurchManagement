import { t } from "@connectapp/i18n";

/** R1.10. One field a church added, as every screen reads it. */
export interface FieldDef {
  id: string;
  label: string;
  type: string;
  options: string[] | null;
}

/**
 * R1.10, R2.x. The same fields, read rather than typed.
 *
 * A church that added a field to its people added it because somebody needs
 * to see the answer. It was only ever on the form and in the directory, so
 * the one screen that is actually the person's record did not carry it.
 *
 * The value is formatted by the field's own kind: a date reads the way the
 * church writes dates, a yes/no reads as a word, and a multi select reads as
 * a list rather than as the shape of an array.
 */
export function customFieldValue(
  field: FieldDef,
  value: unknown,
  date: (iso: string) => string,
): string {
  if (value === null || value === undefined || value === "") return "";

  switch (field.type) {
    case "boolean":
      return value === true ? t("value.yes") : t("value.no");
    case "date":
      return typeof value === "string" ? date(value) : "";
    case "multi_select":
      return Array.isArray(value) ? (value as string[]).join(", ") : "";
    default:
      return String(value);
  }
}
