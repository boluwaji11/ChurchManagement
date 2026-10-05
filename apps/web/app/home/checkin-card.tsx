"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Banner, Button } from "@connectapp/ui";
import type { MyChild } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { Panel } from "@/components/portal/panel";
import { checkInMine } from "./actions";

/**
 * R17.8. Checking your own children in before you arrive.
 *
 * The code is the point. It comes back on the screen and goes on the pair the
 * station prints, so a parent who has it can be matched to their child at
 * pickup whatever happened to the phone on the way in.
 */
export function CheckinCard({
  church,
  occurrenceId,
  serviceName,
  children: kids,
}: {
  church: string;
  occurrenceId: string;
  serviceName: string;
  children: MyChild[];
}) {
  const router = useRouter();
  const [working, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const waiting = kids.filter((one) => !one.code);
  const inAlready = kids.filter((one) => one.code);

  return (
    <Panel className="flex flex-wrap items-center gap-4">
      <span
        aria-hidden
        className="min-h-11 w-1.5 shrink-0 self-stretch rounded-full"
        style={{ background: `var(--hue-${kids[0]?.roomHue ?? "violet"}-500)` }}
      />

      <span className="flex min-w-[220px] flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-semibold leading-6 text-fg">
          {waiting.length > 0
            ? t("checkin.mine.ask", { names: waiting.map((one) => one.name).join(", ") })
            : t("checkin.mine.done")}
        </span>
        <span className="text-[length:var(--d-text-body)] text-fg-muted">
          {serviceName}
          {kids[0]?.roomName ? ` ${kids[0].roomName}` : ""}
        </span>

        {/* R8.10. What the room has to know, said before anybody leaves home. */}
        {kids.some((one) => one.allergy) ? (
          <span className="mt-1 flex items-center gap-1.5 text-caption font-medium text-warning-text">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            {kids
              .filter((one) => one.allergy)
              .map((one) => `${one.name}: ${one.allergy}`)
              .join(" · ")}
          </span>
        ) : null}
      </span>

      {inAlready.length > 0 ? (
        <span className="flex flex-wrap gap-2">
          {inAlready.map((one) => (
            <span
              key={one.memberId}
              className="flex flex-col items-center rounded-xl bg-hue-violet-100 px-4 py-2"
            >
              <span className="text-caption font-medium text-hue-violet-700">
                {t("checkin.mine.code", { name: one.name })}
              </span>
              <span data-numeric className="font-mono text-[26px] leading-8 text-fg">
                {one.code}
              </span>
            </span>
          ))}
        </span>
      ) : null}

      {waiting.length > 0 ? (
        <Button
          loading={working}
          onClick={() =>
            start(async () => {
              const back = await checkInMine(
                occurrenceId,
                waiting.map((one) => one.memberId),
                church,
              );
              setError(back.error ?? null);
              if (!back.error) router.refresh();
            })
          }
        >
          {t("checkin.mine.do")}
        </Button>
      ) : null}

      {error ? (
        <Banner tone="danger" title={t("checkin.mine.failed")}>{error}</Banner>
      ) : null}
    </Panel>
  );
}
