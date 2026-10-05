"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { IconButton } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { SetupProgress } from "@hearth/db";
import { SETUP_LINKS } from "@/lib/setup-links";
import { putAway } from "@/app/setup/actions";

/**
 * R22.1. What is left to set up, across the top of the screen a church opens.
 *
 * A row of steps with the done ones filled and the line between them run
 * through, so the church can see how far along it is without reading five
 * sentences. Every step is read from the church's own records rather than from
 * a box somebody ticked, so it cannot congratulate a church on importing
 * nobody. Each step opens the screen where that work is actually done.
 *
 * It closes, and once closed it lives in Settings until there is nothing left.
 */
export function SetupChecklist({
  church,
  churchName,
  progress,
}: {
  church: string;
  churchName: string;
  progress: SetupProgress;
}) {
  const router = useRouter();
  const [gone, setGone] = React.useState(false);
  const [, startTransition] = React.useTransition();

  if (gone) return null;

  return (
    <section
      className="flex flex-col gap-3 rounded-[14px] border p-5"
      style={{
        background: "var(--hue-amber-tint)",
        borderColor: "color-mix(in oklch, var(--hue-amber-500) 28%, transparent)",
      }}
    >
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-fg">
          {t("setup.finishFor", { name: churchName })}
        </h2>
        <IconButton
          label={t("setup.putAway")}
          variant="ghost"
          className="-my-1.5 -mr-2 size-8 min-h-0 [&_svg]:size-4"
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

      <ol className="flex items-start">
        {progress.steps.map((step, i) => {
          const settled = step.done || step.skipped;
          const before = progress.steps[i - 1];
          const run = Boolean(before && (before.done || before.skipped) && settled);
          return (
            <React.Fragment key={step.step}>
              {i > 0 ? (
                /* The line carries the progress: run through where both ends
                   are answered, and the step's own colour where they are not. */
                <span
                  aria-hidden
                  className="mt-[15px] h-0.5 min-w-4 flex-1 rounded-full"
                  style={{
                    background: run
                      ? "var(--hue-fern-500)"
                      : "color-mix(in oklch, var(--hue-amber-500) 40%, transparent)",
                  }}
                />
              ) : null}

              <li className="flex min-w-0 flex-[0_1_140px] justify-center">
                <Link
                  href={`${SETUP_LINKS[step.step]}?church=${church}`}
                  className="flex min-w-0 flex-col items-center gap-2 rounded-[10px] px-2 py-1 text-center transition-colors hover:bg-[color-mix(in_oklch,var(--hue-amber-500)_14%,transparent)]"
                >
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full border-2"
                    style={
                      settled
                        ? {
                            background: "var(--hue-fern-500)",
                            borderColor: "var(--hue-fern-500)",
                            color: "white",
                          }
                        : { background: "var(--color-surface)", borderColor: "var(--line-strong)" }
                    }
                  >
                    {settled ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="text-balance text-[13px] font-medium text-fg">
                    {t(`setup.short.${step.step}` as never)}
                  </span>
                </Link>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </section>
  );
}
