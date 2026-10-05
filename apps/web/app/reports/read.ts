import { t } from "@connectapp/i18n";

/**
 * R18.12. A value out of Postgres, in words a church reads.
 *
 * Kept in its own module because both the server-rendered report and the
 * client-side table need it, and a plain function exported from a `"use
 * client"` module cannot be called by a server component.
 */
export function read(value: string): string {
  if (value === "true") return t("report.yes");
  if (value === "false") return t("report.no");
  return value === "" ? t("report.blank") : value;
}
