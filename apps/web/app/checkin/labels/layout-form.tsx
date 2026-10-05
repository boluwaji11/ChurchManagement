"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import {
  Banner, Button, Switch,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { LABEL_SIZES, type LabelLayout, type LabelSize } from "@connectapp/db/rules";
import { openLabels } from "../open-labels";
import { saveLayout } from "./actions";

/** The switches, in the order the design puts them. */
type Toggle = "showRoom" | "showAllergies" | "showService" | "parentTag";

const ROWS: { key: Toggle; label: string }[] = [
  { key: "showRoom", label: "labels.showRoom" },
  { key: "showAllergies", label: "labels.showAllergies" },
  { key: "showService", label: "labels.showService" },
  { key: "parentTag", label: "labels.parentTag" },
];

/** R8.11. The layout, with the label drawn beside it as it is changed. */
export function LabelLayoutForm({
  church,
  initial,
}: {
  church: string;
  initial: LabelLayout;
}) {
  const [layout, setLayout] = React.useState(initial);
  const [error, setError] = React.useState<string>();
  const [, startTransition] = React.useTransition();

  const change = (next: LabelLayout) => {
    setLayout(next);
    startTransition(async () => {
      const result = await saveLayout(next, church);
      setError(result.error);
    });
  };

  const sizeLabel = t(`labels.size.${layout.size}` as never);

  return (
    <div className="flex flex-col gap-4">
      {error ? <Banner tone="danger" title={t("labels.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-start gap-5">
        <section className="flex-[1_1_300px] rounded-lg border border-line bg-surface px-5 py-2">
          {ROWS.map((row) => (
            <label
              key={row.key}
              className="flex min-h-[52px] cursor-pointer items-center gap-3.5 border-b border-sunken py-2.5 last:border-0"
            >
              <span className="flex-1 font-medium text-fg">{t(row.label as never)}</span>
              <Switch
                checked={layout[row.key]}
                onCheckedChange={(on) => change({ ...layout, [row.key]: on === true })}
              />
            </label>
          ))}

          <label className="flex items-center gap-3 py-3.5">
            <span className="flex-1 font-medium text-fg">{t("labels.size")}</span>
            <Select
              value={layout.size}
              onValueChange={(size) => change({ ...layout, size: size as LabelSize })}
            >
              <SelectTrigger className="min-h-9 w-auto text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(LABEL_SIZES).map((size) => (
                  <SelectItem key={size} value={size}>
                    {t(`labels.size.${size}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </section>

        <section className="flex flex-[1_1_320px] flex-col gap-3.5">
          <span className="text-[12px] font-medium text-fg-subtle">
            {t("labels.preview", { size: sizeLabel })}
          </span>

          {/* The label itself, at the proportions of the stock it prints on. */}
          <div className="flex max-w-[360px] flex-col gap-1.5 rounded-md border border-line-strong bg-surface px-4.5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex-1 text-[26px] font-bold leading-[30px] text-fg">{t("labels.sample.name")}</span>
              {/* R8.6. The code is on every pair and is not a switch: it is
                  what the two labels are matched on at the door. */}
              <span data-numeric className="font-mono text-[20px] font-semibold tracking-wider text-fg">
                {t("labels.sample.code")}
              </span>
            </div>

            {layout.showRoom ? (
              <span className="text-[15px] font-semibold text-fg">{t("labels.sample.room")}</span>
            ) : null}

            {layout.showAllergies ? (
              <span className="self-start rounded-[4px] border-2 border-fg px-2 py-0.5 text-[13px] font-bold text-fg">
                {t("labels.allergyLine", { what: t("labels.sample.allergy") })}
              </span>
            ) : null}

            {layout.showService ? (
              <span className="text-[12px] text-fg-muted">{t("labels.sample.service")}</span>
            ) : null}
          </div>

          {layout.parentTag ? (
            <div className="flex max-w-[360px] items-center gap-3.5 rounded-md border border-dashed border-line-strong bg-surface px-4.5 py-3.5">
              <span className="flex-1">
                <span className="block text-[12px] font-semibold text-fg-muted">
                  {t("labels.parentTag.keep")}
                </span>
                <span className="block text-[14px] text-fg">
                  {t("labels.parentTag.family", { name: t("labels.sample.family") })}
                </span>
              </span>
              <span data-numeric className="font-mono text-[24px] font-semibold tracking-wider text-fg">
                {t("labels.sample.code")}
              </span>
            </div>
          ) : null}

          <Button
            variant="secondary"
            className="self-start"
            onClick={() => openLabels(`/checkin/labels/print?church=${church}&test=1`)}
          >
            <Printer /> {t("labels.test")}
          </Button>
        </section>
      </div>
    </div>
  );
}
