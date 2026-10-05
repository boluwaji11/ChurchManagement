"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button, IconButton } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { SetupProgress } from "@hearth/db";
import { putAway } from "@/app/setup/actions";

/**
 * R22.1. What is left to set up, on the screen a church opens.
 *
 * Every step is read from the church's own records rather than from a box
 * somebody ticked, so it cannot congratulate a church on importing nobody. It
 * closes, and once closed it lives in Settings until there is nothing left.
 */
export function SetupChecklist({
  church,
  progress,
}: {
  church: string;
  progress: SetupProgress;
}) {
  const router = useRouter();
  const [gone, setGone] = React.useState(false);
  const [, startTransition] = React.useTransition();

  if (gone) return null;

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-fg">{t("setup.title")}</h2>
        <span className="text-caption text-fg-muted tabular-nums">
          {t("setup.progress", { done: String(progress.settled), all: String(progress.steps.length) })}
        </span>
        <IconButton
          label={t("setup.putAway")}
          variant="ghost"
          className="size-8 min-h-0 [&_svg]:size-4"
          onClick={() => {
            setGone(true);
            startTransition(async () => {
              await putAway(church);
              router.refresh();
            });
          }}
        >
          <X />
        </IconButton>
      </div>

      <ol className="flex flex-col gap-2">
        {progress.steps.map((step) => {
          const settled = step.done || step.skipped;
          return (
            <li key={step.step} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-5 shrink-0 place-items-center rounded-full border"
                style={
                  settled
                    ? {
                        background: "var(--hue-fern-tint)",
                        borderColor: "var(--hue-fern-500)",
                        color: "var(--hue-fern-key)",
                      }
                    : { borderColor: "var(--line-strong)" }
                }
              >
                {settled ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>

              <span
                className={
                  settled
                    ? "min-w-0 flex-1 text-[length:var(--d-text-body)] text-fg-muted"
                    : "min-w-0 flex-1 text-[length:var(--d-text-body)] text-fg"
                }
              >
                {t(`setup.step.${step.step}` as never)}
              </span>

              {step.skipped ? (
                <span className="shrink-0 text-caption text-fg-subtle">{t("setup.skipped")}</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <Button asChild className="self-start">
        <Link href={`/setup?church=${church}`}>{t("setup.finish")}</Link>
      </Button>
    </section>
  );
}
