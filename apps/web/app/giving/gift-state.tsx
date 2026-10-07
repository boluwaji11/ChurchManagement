import { Badge } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R13.2. Whether the money has actually arrived.
 *
 * A card answers in a second, so nearly every gift is settled and this draws
 * nothing. A bank transfer is an instruction the bank carries out over the
 * following days: the church sees it coming, no total counts it yet, and if
 * the bank returns it the gift says what the bank said.
 */
export function GiftState({
  status,
  reason,
}: {
  status: string;
  /** What the bank said, shown to whoever can act on it. */
  reason?: string | null;
}) {
  if (status === "pending") {
    return (
      <Badge tone="warning" title={t("giving.gift.pendingWhy")}>
        {t("giving.gift.pending")}
      </Badge>
    );
  }

  if (status === "failed") {
    return (
      <Badge tone="danger" title={reason ?? undefined}>
        {t("giving.gift.failedState")}
      </Badge>
    );
  }

  return null;
}
