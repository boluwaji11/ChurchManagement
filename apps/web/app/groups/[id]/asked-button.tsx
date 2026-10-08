"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Banner, Spinner, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Confirm } from "@/components/confirm";
import { unask } from "../actions";

/**
 * R9.5. A request that has been made, and the way back out of it.
 *
 * It read as a badge, which is a thing that is told to you rather than a
 * thing you can do anything about: somebody who pressed Join on the wrong
 * group could only wait for a leader to answer a question they no longer
 * wanted asked. Hovering turns it into the press that takes it back, and it
 * asks first, the way everything else that undoes something does.
 */
export function AskedButton({ church, groupId }: { church: string; groupId: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [over, setOver] = React.useState(false);
  const [working, start] = React.useTransition();

  return (
    <span className="flex flex-wrap items-center gap-3">
      {error ? <Banner tone="danger" title={t("find.failed")}>{error}</Banner> : null}

      <Confirm
        title={t("find.unaskTitle")}
        confirmLabel={t("find.unask")}
        disabled={working}
        onConfirm={() => new Promise<void>((done) => {
          start(async () => {
            const back = await unask(groupId, church);
            setError(back.error);
            router.refresh();
            done();
          });
        })}
        trigger={
          <button
            type="button"
            disabled={working}
            onPointerEnter={() => setOver(true)}
            onPointerLeave={() => setOver(false)}
            onFocus={() => setOver(true)}
            onBlur={() => setOver(false)}
            aria-label={t("find.unask")}
            className={cn(
              "flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3",
              "text-[13px] font-medium transition-colors duration-instant [&_svg]:size-3.5",
              over
                ? "border-danger-border bg-danger-soft text-danger-text"
                : "border-line-strong bg-surface text-fg-muted",
            )}
          >
            {working ? <Spinner label={t("find.unask")} /> : over ? <X aria-hidden /> : <Check aria-hidden />}
            {over ? t("find.unask") : t("find.asked")}
          </button>
        }
      />
    </span>
  );
}
