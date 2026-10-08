import { CornerDownRight } from "lucide-react";
import { money } from "@/lib/money";
import { longDate } from "@/lib/dates";
import { t } from "@connectapp/i18n";
import { GiftState } from "./gift-state";
import { RepeatMark } from "./repeat-mark";
import { AttachGift } from "./attach";
import { RefundGift } from "./refund";
import type { GiftRow } from "./rows";

/**
 * R13.21, R24.6. The gift list as it reads on a phone.
 *
 * The table carries seven columns, which is the right shape on a desk and
 * four hundred pixels of sideways scrolling on a phone. The same rows stack
 * here instead: who gave and how much on the first line, because that is
 * what the eye is looking for, then the date, the fund and the method under
 * it, then where the money has got to.
 *
 * It renders from `giftRows`, the same model the table draws, so a refund is
 * still a line of its own under the gift it came off and the two screens can
 * never drift apart.
 */
export function GiftCards({
  rows,
  church,
  manage,
}: {
  rows: GiftRow[];
  church: string;
  /** R13.15, R13.18. Whether this reader may attach or refund. */
  manage: boolean;
}) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((row) => {
        const gift = row.gift;
        const back = row.kind === "refund";

        return (
          <li
            key={row.key}
            className={
              back
                /* A refund belongs to the gift above it, so it is indented
                   under it rather than ruled off as a payment of its own. */
                ? "flex flex-col gap-1 border-t border-sunken py-2.5 pr-4 pl-10 italic text-fg-muted"
                : "flex flex-col gap-1 border-t border-line px-4 py-3 first:border-0"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {back ? <CornerDownRight className="size-3.5 shrink-0" aria-hidden /> : null}
                <span className="truncate font-medium text-fg">
                  {gift.memberName ?? t("giving.gift.anonymous")}
                </span>
              </span>

              <span
                data-numeric
                className={`flex shrink-0 items-center gap-1.5 ${
                  gift.status === "settled" && !back
                    ? "font-semibold text-fg"
                    : "text-fg-subtle"
                }`}
              >
                {gift.recurring && !back ? <RepeatMark /> : null}
                {gift.inKindDescription && !back ? "" : money(row.amountCents)}
              </span>
            </div>

            <span className="text-[12px] text-fg-subtle">
              {[longDate(row.on), gift.fundName, t(`giving.method.${gift.method}` as never)]
                .filter(Boolean)
                .join(" · ")}
            </span>

            {/* R13.18. A gift on nobody's record is on nobody's statement. */}
            {gift.memberId === null && !back ? (
              <span className="text-[12px] text-fg-subtle">
                {t("giving.gift.unattached")}
              </span>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px]">
                <GiftState status={row.status} reason={gift.failureReason} />
              </span>

              <span className="flex items-center gap-1">
                {manage && gift.memberId === null && !back ? (
                  <AttachGift church={church} gift={{ id: gift.id, typed: gift.memberName }} />
                ) : null}
                {manage && !back && !gift.inKindDescription
                  && gift.status === "settled"
                  && gift.amountCents > gift.refundedCents ? (
                  <RefundGift
                    church={church}
                    gift={{
                      id: gift.id,
                      amountCents: gift.amountCents,
                      refundedCents: gift.refundedCents,
                      method: gift.method,
                      giver: gift.memberName,
                    }}
                  />
                ) : null}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * R13.19, R24.6. A giver's own gifts, as they read on a phone.
 *
 * The same stacking as the treasurer's list, without the two actions a
 * giver never has: the amount leads with the date, the fund and the method
 * under it, and anything the bank is still carrying says so.
 */
export function MyGiftCards({ rows }: { rows: GiftRow[] }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((row) => {
        const back = row.kind === "refund";

        return (
          <li
            key={row.key}
            className={
              back
                ? "flex flex-col gap-1 border-t border-sunken py-2.5 pr-5 pl-10 italic text-fg-muted"
                : "flex flex-col gap-1 border-t border-line px-5 py-3 first:border-0"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {back ? <CornerDownRight className="size-3.5 shrink-0" aria-hidden /> : null}
                <span className="truncate text-fg">{row.gift.fundName}</span>
              </span>

              <span
                data-numeric
                className={`flex shrink-0 items-center gap-1.5 ${
                  row.status === "settled" && !back
                    ? "font-semibold text-fg"
                    : "text-fg-subtle"
                }`}
              >
                {row.gift.recurring && !back ? <RepeatMark /> : null}
                {row.gift.inKindDescription && !back
                  ? row.gift.inKindDescription
                  : money(row.amountCents)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13px] text-fg-subtle">
                {longDate(row.on)} {"·"} {t(`giving.method.${row.gift.method}` as never)}
              </span>
              <span className="text-[13px]">
                <GiftState status={row.status} audience="giver" />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
