import { t } from "@connectapp/i18n";

/**
 * R22.8. Every word on a date picker, in one place.
 *
 * Three screens had written the same seven lines out, which is three places
 * for a wording change to be missed.
 */
export const DATE_LABELS = () => ({
  open: t("date.open"),
  clear: t("date.clear"),
  previousMonth: t("date.previousMonth"),
  nextMonth: t("date.nextMonth"),
  month: t("date.month"),
  year: t("date.year"),
  today: t("date.today"),
});
