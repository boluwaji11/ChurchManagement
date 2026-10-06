import { t } from "@connectapp/i18n";

/**
 * R1.5. The screen somebody's role does not open.
 *
 * One answer everywhere, in the middle of the page, because a banner at the top
 * of an otherwise empty screen reads as a notice about the screen rather than
 * as the screen itself. The refusal that matters is in the query layer; this is
 * what it looks like.
 */
export function Denied() {
  return (
    <div className="grid min-h-[50vh] place-items-center px-6 py-10 text-center">
      <p className="font-display text-[22px] leading-7 text-fg">{t("forbidden.denied")}</p>
    </div>
  );
}
