"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Badge, Banner, Button, Card, cn } from "@connectapp/ui";
import { plural, t } from "@connectapp/i18n";
import { skip, putAway } from "./actions";

export interface StepView {
  step: string;
  done: boolean;
  skipped: boolean;
  href: string;
}

/**
 * R22.1, R22.3. The first hour.
 *
 * Five things a church does once, in the order one unblocks the next, each
 * linking to the screen that does it rather than wrapping that screen in a
 * wizard. A church that adds a service time here and another one next March
 * should be in the same place both times, and learning where things are is
 * most of what the first hour is for.
 *
 * Every step says what it unlocks, because "when you meet" does not tell
 * anybody that attendance and check-in have nothing to attach to without it.
 * The next one to do leads: it is numbered in ink, carries the only filled
 * button on the screen, and the ones behind it go quiet.
 */
export function Steps({
  church,
  churchName,
  person,
  steps,
  settled,
  left,
}: {
  church: string;
  churchName: string;
  /** Whoever made the church, so the welcome is addressed to somebody. */
  person?: string;
  steps: StepView[];
  settled: number;
  left: number;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const next = steps.find((step) => !step.done && !step.skipped);
  const skippedCount = steps.filter((step) => step.skipped && !step.done).length;

  return (
    <div className="flex max-w-[840px] flex-col gap-8" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("setup.failed")}>{error}</Banner> : null}

      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-[clamp(28px,3.4vw,36px)] font-normal leading-[1.15] text-fg">
          {person ? t("setup.welcome", { name: person }) : t("setup.title")}
        </h2>
        <p className="m-0 max-w-[62ch] text-[17px] leading-7 text-fg-muted">
          {t("setup.lede", { church: churchName })}
        </p>
      </div>

      {/* How far along, said as a number somebody would say out loud. A
          fraction read "5 of 5" beside a step still marked Skipped. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-2 w-48 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-slow"
            style={{ width: `${(settled / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-[length:var(--d-text-label)] font-medium text-fg-muted">
          {left === 0 ? t("setup.left.none") : plural("setup.left", left)}
        </span>
        {skippedCount > 0 ? (
          <span className="text-[length:var(--d-text-label)] text-fg-subtle">
            {plural("setup.alsoSkipped", skippedCount)}
          </span>
        ) : null}
      </div>

      <Card className="flex flex-col divide-y divide-line p-0">
        {steps.map((step, i) => {
          const here = next?.step === step.step;
          return (
            <div
              key={step.step}
              className={cn(
                "flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-5",
                here && "bg-primary-soft/50",
              )}
            >
              <span className="flex min-w-0 flex-1 items-start gap-4">
                {/* Done is a tick, the one to do next is its number in ink, and
                    the ones after it are the number in a quiet ring. */}
                <span
                  aria-hidden
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold",
                    step.done
                      ? "bg-primary text-primary-fg"
                      : here
                        ? "bg-primary text-primary-fg"
                        : "border-2 border-line-strong text-fg-subtle",
                  )}
                >
                  {step.done ? <Check className="size-4" /> : i + 1}
                </span>

                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-[17px] font-semibold",
                        step.done ? "text-fg-muted" : "text-fg",
                      )}
                    >
                      {t(`setup.step.${step.step}` as never)}
                    </span>
                    {step.skipped && !step.done ? (
                      <Badge tone="neutral">{t("setup.skipped")}</Badge>
                    ) : null}
                  </span>
                  {step.done ? null : (
                    <span className="max-w-[58ch] text-[15px] leading-[22px] text-fg-muted">
                      {t(`setup.why.${step.step}` as never)}
                    </span>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 flex-wrap items-center gap-2">
                {step.done ? null : (
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => skip(step.step as never, !step.skipped, church))}
                  >
                    {step.skipped ? t("setup.unskip") : t("setup.skip")}
                  </Button>
                )}
                <Button asChild variant={here ? "primary" : "secondary"}>
                  <Link href={`${step.href}?church=${church}`}>
                    {step.done ? t("setup.change") : t("setup.do")}
                    {here ? <ArrowRight /> : null}
                  </Link>
                </Button>
              </span>
            </div>
          );
        })}
      </Card>

      <div>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => putAway(church))}>
          {t("setup.putAway")}
        </Button>
      </div>
    </div>
  );
}
