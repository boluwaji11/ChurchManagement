import { t } from "@hearth/i18n";

/**
 * R24.6. How long ago, in the words the design uses.
 *
 * Resolved on the server so a notification panel does not depend on the
 * browser's clock agreeing with the church's.
 */
export function when(iso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 2) return t("when.now");
  if (minutes < 60) return t("when.minutes", { count: minutes });

  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("when.hours", { count: hours });
  if (hours < 48) return t("when.yesterday");
  return t("when.days", { count: Math.round(hours / 24) });
}
