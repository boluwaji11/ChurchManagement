"use client";

import { Repeat } from "lucide-react";
import { Tooltip } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R13.3. A gift Stripe collected on its own.
 *
 * Beside the amount, because the question it answers is about the money: a
 * treasurer reading the column is working out what the church can plan on.
 */
export function RepeatMark() {
  return (
    <Tooltip content={t("giving.recurring.mark")}>
      <span className="inline-flex text-primary">
        <Repeat className="size-3.5 shrink-0" aria-label={t("giving.recurring.mark")} />
      </span>
    </Tooltip>
  );
}
