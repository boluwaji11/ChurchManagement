"use client";

import * as React from "react";
import { Play, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { Banner, Button, Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import type { LiveState } from "@connectapp/db";
import { liveNow, begin, move, jumpTo, end } from "./actions";

const TICK = 3000;

/** mm:ss, from a count of seconds. Hours roll into the minutes, so 1:02:03 reads 62:03. */
const clock = (seconds: number): string => {
  const whole = Math.max(Math.floor(seconds), 0);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

/**
 * R11.11. The screen a service is run from, and the one the team follows.
 *
 * Big type, two controls, nothing else. It is read at arm's length on a music
 * stand by somebody who is also playing, so the current item is the largest
 * thing on the screen and the next one is under it.
 *
 * Whoever cannot run services gets the same screen with no buttons, because
 * what the team needs is to know where everybody is.
 */
export function Stage({
  church,
  occurrenceId,
  initial,
  canRun,
}: {
  church: string;
  occurrenceId: string;
  initial: LiveState;
  canRun: boolean;
}) {
  const [live, setLive] = React.useState(initial);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [now, setNow] = React.useState(() => Date.now());

  // The clock ticks locally, the state is asked for less often.
  React.useEffect(() => {
    const beat = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(beat);
  }, []);

  React.useEffect(() => {
    const poll = setInterval(() => {
      liveNow(occurrenceId, church).then((found) => {
        if (found) setLive(found);
      });
    }, TICK);
    return () => clearInterval(poll);
  }, [occurrenceId, church]);

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      const found = await liveNow(occurrenceId, church);
      if (found) setLive(found);
    });
  };

  const at = live.currentId ? live.items.findIndex((i) => i.id === live.currentId) : -1;
  const current = at >= 0 ? live.items[at] : null;
  const next = at >= 0 ? live.items[at + 1] : live.items[0];

  const sinceItem = live.itemAt ? (now - Date.parse(live.itemAt)) / 1000 : 0;
  const planned = (current?.minutes ?? 0) * 60;
  const against = planned - sinceItem;

  // R11.11. Elapsed against planned, for the whole service rather than the
  // item, because the question on a service morning is whether to cut something.
  const sinceStart = live.startedAt ? (now - Date.parse(live.startedAt)) / 1000 : 0;
  const plannedSoFar = live.items
    .slice(0, Math.max(at, 0) + (live.running ? 1 : 0))
    .reduce((total, item) => total + item.minutes * 60, 0);
  const drift = sinceStart - plannedSoFar;

  if (live.items.length === 0) return <Empty icon="order" title={t("order.empty")} />;

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("live.failed")}>{error}</Banner> : null}

      <Card className="flex flex-col gap-4 p-6">
        {live.running && current ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-label text-fg-muted">{t("live.now")}</span>
              <span
                className="font-display text-display text-fg"
                aria-live="polite"
              >
                {current.title}
              </span>
              {current.description ? (
                <span className="text-[length:var(--d-text-body)] text-fg-muted">
                  {current.description}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-baseline gap-4">
              <span
                className={`font-display text-display tabular-nums ${
                  against < 0 ? "text-danger-text" : "text-fg"
                }`}
              >
                {clock(sinceItem)}
              </span>
              <span className="text-[length:var(--d-text-body)] text-fg-muted tabular-nums">
                {t("live.elapsed", {
                  elapsed: clock(sinceItem),
                  planned: clock(planned),
                })}
              </span>
              <span
                className={`text-[length:var(--d-text-body)] tabular-nums ${
                  drift > 0 ? "text-danger-text" : "text-fg-muted"
                }`}
              >
                {drift > 0
                  ? t("live.over", { over: clock(drift) })
                  : t("live.under", { under: clock(-drift) })}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-t border-hairline pt-4">
              <span className="text-label text-fg-muted">{t("live.then")}</span>
              <span className="font-display text-heading text-fg">
                {next ? next.title : t("live.done")}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-label text-fg-muted">{t("live.waiting")}</span>
            <span className="font-display text-display text-fg">{live.serviceName}</span>
          </div>
        )}

        {canRun ? (
          <div className="flex flex-wrap items-center gap-2">
            {live.running ? (
              <>
                <Button
                  variant="secondary"
                  disabled={pending || at <= 0}
                  onClick={() => run(() => move(occurrenceId, "back", church))}
                >
                  <ChevronLeft /> {t("live.back")}
                </Button>
                <Button
                  disabled={pending}
                  onClick={() => run(() => move(occurrenceId, "next", church))}
                >
                  {t("live.next")} <ChevronRight />
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => end(occurrenceId, church))}
                >
                  <Square /> {t("live.stop")}
                </Button>
              </>
            ) : (
              <Button disabled={pending} onClick={() => run(() => begin(occurrenceId, church))}>
                <Play /> {t("live.start")}
              </Button>
            )}
          </div>
        ) : (
          <span className="text-caption text-fg-muted">{t("live.watching")}</span>
        )}
      </Card>

      {/* The rest of the plan, so a leader can jump when the order changes on
          the floor, and the team can see what is coming. */}
      <Card className="flex flex-col p-2">
        <ul className="flex flex-col">
          {live.items.map((item, i) => {
            const body = (
              <span className="flex w-full items-center gap-3">
                <span className="w-6 shrink-0 text-caption text-fg-subtle tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)]">
                  {item.title}
                </span>
                <span className="shrink-0 text-caption text-fg-muted tabular-nums">
                  {item.minutes}
                </span>
              </span>
            );
            const tone =
              item.id === live.currentId
                ? "bg-sunken font-medium text-fg"
                : i < at
                  ? "text-fg-subtle"
                  : "text-fg";

            return (
              <li key={item.id}>
                {canRun && live.running ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => jumpTo(occurrenceId, item.id, church))}
                    className={`flex w-full rounded-[var(--d-radius-control)] px-3 py-2.5 text-left hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${tone}`}
                  >
                    {body}
                  </button>
                ) : (
                  <span
                    className={`flex w-full rounded-[var(--d-radius-control)] px-3 py-2.5 ${tone}`}
                  >
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
