import { Lock } from "lucide-react";
import { t } from "@connectapp/i18n";

/**
 * Two pictures of the product, drawn rather than photographed.
 *
 * A giving form and a pair of check-in labels are small enough to draw exactly,
 * and drawing them means they stay true when the tokens move. Neither is
 * interactive: a church presses "Get started free" to reach the real one.
 */

/** The gift a member gives, as a member sees it. */
export function GiveCard() {
  return (
    <div className="flex w-[min(340px,100%)] flex-col gap-4 rounded-[20px] border border-line bg-surface p-6 shadow-[0_8px_32px_oklch(0_0_0/0.1)]">
      <span className="font-display text-[22px] text-fg">{t("site.giving.card.title")}</span>

      <div className="grid grid-cols-3 gap-2">
        <span className="grid h-12 place-items-center rounded-xl border border-stone-300 bg-surface text-[17px] font-semibold text-fg">
          $25
        </span>
        <span className="grid h-12 place-items-center rounded-xl bg-primary text-[17px] font-semibold text-primary-fg">
          $50
        </span>
        <span className="grid h-12 place-items-center rounded-xl border border-stone-300 bg-surface text-[17px] font-semibold text-fg">
          $100
        </span>
      </div>

      <div className="flex h-11 items-center justify-between rounded-xl border border-stone-300 px-3.5">
        <span className="text-fg-muted">{t("site.giving.card.fund")}</span>
        <span className="font-medium text-fg">{t("site.giving.card.general")}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-fg">{t("site.giving.card.monthly")}</span>
        <span className="relative h-[26px] w-11 rounded-full bg-primary">
          <span className="absolute right-[3px] top-[3px] size-5 rounded-full bg-white" />
        </span>
      </div>

      <span className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-fg">
        <Lock className="size-4" aria-hidden />
        {t("site.giving.card.submit")}
      </span>
    </div>
  );
}

/**
 * R8.4. The pair a volunteer tears off: the child's label and the parent's tag,
 * carrying the same code. Printed on white, in black, because that is what a
 * label printer does.
 */
export function CheckinLabels() {
  return (
    <div className="flex flex-wrap justify-center gap-5 rounded-[20px] bg-sunken px-6 py-14">
      <div className="flex h-[150px] w-[300px] -rotate-2 overflow-hidden rounded-[10px] bg-white text-black shadow-[0_1px_2px_oklch(0_0_0/0.08),0_8px_24px_oklch(0_0_0/0.08)]">
        <span className="w-3.5 flex-none bg-hue-teal-500" />
        <div className="flex flex-1 flex-col justify-between px-4 py-3.5">
          <div className="flex items-start gap-2">
            <span className="flex-1 text-[28px] font-bold leading-[30px]">
              {t("site.checkin.label.name")}
            </span>
            <span className="font-mono text-[20px] font-bold">{t("site.checkin.label.code")}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-semibold">{t("site.checkin.label.room")}</span>
            <span className="self-start rounded-[3px] border-2 border-black px-1.5 text-[12px] font-bold">
              {t("site.checkin.label.allergy")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex h-[150px] w-[200px] rotate-[2.5deg] flex-col justify-between rounded-[10px] bg-white px-4 py-3.5 text-black shadow-[0_1px_2px_oklch(0_0_0/0.08),0_8px_24px_oklch(0_0_0/0.08)]">
        <span className="text-[11px] font-bold tracking-[0.06em]">{t("site.checkin.label.parent")}</span>
        <div className="flex items-end gap-2">
          <span className="flex-1 text-[14px]">{t("site.checkin.label.first")}</span>
          <span className="font-mono text-[32px] font-bold leading-none">
            {t("site.checkin.label.code")}
          </span>
        </div>
      </div>
    </div>
  );
}
