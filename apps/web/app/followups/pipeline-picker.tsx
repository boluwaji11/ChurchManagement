"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Combobox, Spinner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R5.5. Which pipeline the board is showing.
 *
 * A church runs six of these and will run twenty, so it is a box you type into
 * rather than a row of pills that wraps onto three lines.
 *
 * R24.6. The whole board comes from the server, so the box holds itself shut
 * while the new one is fetched and marks the wait beside itself. The mark fades
 * in after a moment, so a board that answers at once flashes nothing.
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
  const [busy, startOpening] = React.useTransition();

  return (
    <div className="flex w-full max-w-[280px] items-center gap-2" aria-busy={busy}>
      <Combobox
        aria-label={t("queue.title")}
        className="min-w-0 flex-1"
        options={pipelines.map((one) => ({ value: one.key, label: one.name }))}
        value={current}
        disabled={busy}
        onChange={(key) =>
          startOpening(() => {
            router.push(`/followups?church=${church}&pipeline=${key}`);
          })
        }
        emptyLabel={t("board.noPipeline")}
        clearLabel={t("date.clear")}
        clearable={false}
      />

      {busy ? (
        <Spinner
          label={t("common.opening")}
          className="shrink-0 opacity-0 [animation:connectapp-fade_var(--duration-fast)_var(--ease-out)_200ms_forwards]"
        />
      ) : null}
    </div>
  );
}
