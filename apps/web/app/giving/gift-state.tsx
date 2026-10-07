import { Badge } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R13.2. Where the money has got to.
 *
 * A card answers in a second. A bank transfer is an instruction the bank
 * carries out over the following days, and it can be returned after that.
 *
 * The church and the giver are told the same thing in their own words: the
 * church is reconciling a deposit, so what it needs to know is that the money
 * is in, and the giver is asking whether their gift went through.
 */
export function GiftState({
  status,
  reason,
  audience = "church",
}: {
  status: string;
  /** What the bank said, for whoever can act on it. */
  reason?: string | null;
  audience?: "church" | "giver";
}) {
  if (status === "pending") {
    return (
      <Badge tone="warning" title={t("giving.gift.pendingWhy")}>
        {t("giving.state.processing")}
      </Badge>
    );
  }

  if (status === "failed") {
    return (
      <Badge tone="danger" title={reason ?? undefined}>
        {t("giving.state.failed")}
      </Badge>
    );
  }

  /* Nearly every gift is settled, so it reads as a word rather than a badge:
     a mark on every row is a mark that says nothing. */
  return (
    <span className="text-fg-subtle">
      {audience === "giver" ? t("giving.state.complete") : t("giving.state.received")}
    </span>
  );
}
