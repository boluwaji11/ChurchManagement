"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import {
  Badge, Banner, Button, Dialog, DialogContent, DialogClose, DialogFooter, Working, cn,
} from "@connectapp/ui";
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
 * should be in the same place both times, and learning where things are is most
 * of what the first hour is for.
 *
 * Drawn as a path rather than a table: a marker per step with a line running
 * between them, and each step standing on its own. A church is being told how
 * far along it is, and a list of rows in one box says nothing about order.
 */
export function Steps({
  church,
  person,
  steps,
  settled,
  left,
}: {
  church: string;
  /** Whoever made the church, so the welcome is addressed to somebody. */
  person?: string;
  steps: StepView[];
  settled: number;
  left: number;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [asking, setAsking] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  /** R22.1. Done with setup, one way or the other: into the product. */
  const finish = () =>
    startTransition(async () => {
      const result = await putAway(church);
      if (result.error) {
        setError(result.error);
        return;
      }
      setLeaving(true);
      router.push(`/dashboard?church=${church}`);
    });

  const next = steps.find((step) => !step.done && !step.skipped);
  const skippedCount = steps.filter((step) => step.skipped && !step.done).length;

  return (
    <div className="flex flex-col gap-9" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("setup.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="m-0 font-display text-[clamp(26px,3vw,32px)] font-normal leading-[1.15] text-fg">
            {person ? t("setup.welcome", { name: person }) : t("setup.title")}
          </h1>
          <p className="m-0 max-w-[58ch] text-[16px] leading-6 text-fg-muted">{t("setup.lede")}</p>
        </div>

        {/* How far along, in the corner, out of the way of the words. */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-[length:var(--d-text-label)] font-semibold text-fg">
            {left === 0 ? t("setup.left.none") : plural("setup.left", left)}
          </span>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-stone-300">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-slow"
              style={{ width: `${(settled / steps.length) * 100}%` }}
            />
          </div>
          {skippedCount > 0 ? (
            <span className="text-[length:var(--d-text-caption)] text-fg-subtle">
              {plural("setup.alsoSkipped", skippedCount)}
            </span>
          ) : null}
        </div>
      </div>

      <ol className="m-0 flex list-none flex-col p-0">
        {steps.map((step, i) => {
          const here = next?.step === step.step;
          const last = i === steps.length - 1;

          return (
            <li key={step.step} className={cn("flex gap-5", last ? "pb-0" : "pb-4")}>
              {/* The path: a marker per step, the line between them running
                  through the gap to the next one. */}
              <span className="flex w-9 shrink-0 flex-col items-center" aria-hidden>
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-semibold",
                    step.done || here
                      ? "bg-primary text-primary-fg"
                      : "border-2 border-stone-300 bg-surface text-fg-subtle",
                  )}
                >
                  {step.done ? <Check className="size-[18px]" /> : i + 1}
                </span>
                {last ? null : (
                  <span
                    className={cn("w-0.5 flex-1 rounded-full", step.done ? "bg-primary" : "bg-stone-300")}
                  />
                )}
              </span>

              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-4",
                  "rounded-2xl border bg-surface p-5",
                  "transition-[border-color,box-shadow,transform] duration-200 ease-out",
                  here
                    ? "border-primary/40 shadow-[0_8px_24px_oklch(0.3_0.04_75/0.10)] hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_14px_34px_oklch(0.3_0.04_75/0.14)]"
                    : "border-line",
                )}
              >
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
                    <span className="max-w-[54ch] text-[15px] leading-[22px] text-fg-muted">
                      {t(`setup.why.${step.step}` as never)}
                    </span>
                  )}
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
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-end gap-4">
        {left === 0 ? (
          <Button disabled={pending} onClick={finish}>
            {t("setup.finish")} <ArrowRight />
          </Button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setAsking(true)}
            className="cursor-pointer text-[length:var(--d-text-body)] font-medium text-primary underline underline-offset-4 disabled:opacity-45"
          >
            {t("setup.putAway")}
          </button>
        )}
      </div>

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent alert title={t("setup.skipAll.title")}>
          <p className="mb-5 text-[length:var(--d-text-body)] text-fg">{t("setup.skipAll.body")}</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" data-dismiss>{t("setup.skipAll.keep")}</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setAsking(false);
                finish();
              }}
            >
              {t("setup.skipAll.go")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Working open={leaving} label={t("setup.finishing")} />
    </div>
  );
}
