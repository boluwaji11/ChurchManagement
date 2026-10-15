"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { Banner, Progress, Switch } from "@connectapp/ui";
import { plural, t } from "@connectapp/i18n";
import type { SetupPhase, SetupProgress, SetupStep } from "@connectapp/db";
import { GuideBody } from "@/components/guide/body";
import { showGuide, skip } from "@/components/guide/guide-actions";
import { SettingCard } from "../card";
import { useFormError } from "@/lib/form-error";

/**
 * R22.1. The whole of setting up, on one screen, and whether the guide shows.
 *
 * Every phase is open here rather than one at a time, because somebody who has
 * come looking for this wants the whole list. The guide beside the screen is
 * the one that paces it.
 */
export function GuideSettings({ progress }: { progress: SetupProgress }) {
  const router = useRouter();
  const [error, setError] = useFormError(false);
  const [pending, startTransition] = React.useTransition();
  const [phase, setPhase] = React.useState<SetupPhase>(progress.phase);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const answer = await work();
      setError(answer.error);
      if (!answer.error) router.refresh();
    });

  const on = !progress.dismissed;

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger">{t(error as never)}</Banner> : null}

      <SettingCard
        icon={<ListChecks />}
        title={t("setup.bringBack")}
        lede={on ? t("setup.bringBack.on") : t("setup.bringBack.off")}
        action={
          <Switch
            checked={on}
            disabled={pending}
            aria-label={t("setup.bringBack")}
            onCheckedChange={(next) => run(() => showGuide(next))}
          />
        }
      />

      <SettingCard icon={<ListChecks />} title={t("setup.all")}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] text-fg-muted">
              {progress.left === 0
                ? t("setup.left.none")
                : plural("setup.left", progress.left)}
            </span>
            <span className="min-w-[160px] flex-1">
              <Progress
                value={progress.settled}
                max={progress.steps.length}
                label={t("setup.count", {
                  done: String(progress.settled),
                  all: String(progress.steps.length),
                })}
              />
            </span>
          </div>

          <GuideBody
            steps={progress.steps}
            phase={phase}
            here={null}
            busy={pending}
            onSkip={(step: SetupStep, value: boolean) => run(() => skip(step, value))}
            onOpenPhase={setPhase}
          />
        </div>
      </SettingCard>
    </div>
  );
}
