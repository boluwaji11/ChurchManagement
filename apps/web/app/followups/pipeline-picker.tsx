"use client";

import { useRouter } from "next/navigation";
import { Combobox } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R5.5. Which pipeline the board is showing.
 *
 * A church runs six of these and will run twenty, so it is a box you type into
 * rather than a row of pills that wraps onto three lines.
 */
export function PipelinePicker({
  church,
  pipelines,
  current,
}: {
  church: string;
  pipelines: { key: string; name: string }[];
  current: string;
}) {
  const router = useRouter();

  return (
    <Combobox
      aria-label={t("queue.title")}
      className="w-full max-w-[280px]"
      options={pipelines.map((one) => ({ value: one.key, label: one.name }))}
      value={current}
      onChange={(key) => router.push(`/followups?church=${church}&pipeline=${key}`)}
      emptyLabel={t("board.noPipeline")}
      clearLabel={t("date.clear")}
      clearable={false}
    />
  );
}
