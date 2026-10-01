"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { Badge, Banner, Button, Card, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { skip, putAway } from "./actions";

export interface StepView {
  step: string;
  done: boolean;
  skipped: boolean;
  href: string;
}

/**
 * R22.1. The five things a church does once.
 *
 * Each one links to the screen that does it, rather than wrapping that screen
 * in a wizard. A church that adds a service time here and another one next
 * March should be in the same place both times, and learning where things are
 * is most of what the first hour is for.
 */
export function Steps({
  church,
  steps,
  settled,
}: {
  church: string;
  steps: StepView[];
  settled: number;
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

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("setup.title")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="h-2 w-48 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(settled / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-caption text-fg-muted">
          {t("setup.progress", { done: String(settled), all: String(steps.length) })}
        </span>
      </div>

      <Card className="flex flex-col">
        {steps.map((step, i) => (
          <div key={step.step}>
            {i > 0 ? <Separator className="my-3" /> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className={
                    step.done
                      ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[var(--primary-fg)]"
                      : "flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-line-strong"
                  }
                >
                  {step.done ? <Check className="size-4" /> : null}
                </span>
                <span className="flex flex-col">
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    {t(`setup.step.${step.step}` as never)}
                  </span>
                  {step.skipped && !step.done ? (
                    <Badge tone="neutral">{t("setup.skipped")}</Badge>
                  ) : null}
                </span>
              </span>

              <span className="flex flex-wrap items-center gap-2">
                {step.done ? null : (
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => skip(step.step as never, !step.skipped, church))}
                  >
                    {step.skipped ? t("setup.unskip") : t("setup.skip")}
                  </Button>
                )}
                <Button asChild variant={next?.step === step.step ? "primary" : "secondary"}>
                  <Link href={`${step.href}?church=${church}`}>
                    {step.done ? t("setup.change") : t("setup.do")}
                    {next?.step === step.step ? <ArrowRight /> : null}
                  </Link>
                </Button>
              </span>
            </div>
          </div>
        ))}
      </Card>

      <div>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => putAway(church))}>
          {t("setup.putAway")}
        </Button>
      </div>
    </div>
  );
}
