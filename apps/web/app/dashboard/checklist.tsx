"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { IconButton } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { SetupProgress } from "@connectapp/db";
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

      {/* Across the top where there is room for it, and down the screen on a
          phone, where six steps squeezed onto one row leaves each of them
          three letters wide. */}
      <ol className="flex flex-col sm:flex-row sm:items-start">
        {progress.steps.map((step, i) => {
          const settled = step.done || step.skipped;
          const before = progress.steps[i - 1];
          const run = Boolean(before && (before.done || before.skipped) && settled);
          return (
            <React.Fragment key={step.step}>
              {i > 0 ? (
                /* The line carries the progress: run through where both ends
                   are answered, and the step's own colour where they are not.
                   The dot halfway marks the span rather than leaving a bare
                   rule between two circles. */
                <span
                  aria-hidden
                  className="relative mt-[15px] hidden h-0.5 min-w-4 flex-1 rounded-full sm:block"
                  style={{
                    background: run
                      ? "var(--hue-fern-500)"
                      : "color-mix(in oklch, var(--hue-amber-500) 40%, transparent)",
                  }}
                >
                  <span
                    className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background: run
                        ? "var(--hue-fern-500)"
                        : "color-mix(in oklch, var(--hue-amber-500) 70%, transparent)",
                    }}
                  />
                </span>
              ) : null}

              <li className="flex min-w-0 sm:flex-[0_1_140px] sm:justify-center">
                <Link
                  href={`${SETUP_LINKS[step.step]}?church=${church}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-[color-mix(in_oklch,var(--hue-amber-500)_14%,transparent)] sm:flex-none sm:flex-col sm:gap-2 sm:py-1 sm:text-center"
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
