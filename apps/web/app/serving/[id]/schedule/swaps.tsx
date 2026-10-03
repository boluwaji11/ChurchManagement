"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Repeat, TriangleAlert, X } from "lucide-react";
import {
  Banner, Button, Card, IconButton, Separator,
  Dialog, DialogTrigger, DialogContent,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { PlanCandidate } from "@hearth/db";
import { whoCouldCover, putSomebodyIn, closeSwap } from "../../actions";

export interface Swap {
  id: string;
  personName: string;
  positionName: string;
  reason: string | null;
}

/**
 * R10.7. Swaps waiting on this leader.
 *
 * Above the schedule, because an unanswered swap is the thing that goes wrong
 * on the day, and a leader who has to go looking for it will find it on the
 * morning.
 */
export function Swaps({
  church,
  swaps,
}: {
  church: string;
  swaps: Swap[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  if (swaps.length === 0) return null;

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <Card className="flex flex-col gap-3 border-warning/30 bg-warning-soft p-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("plan.failed")}>{error}</Banner> : null}

      <h3 className="flex items-center gap-2 font-display text-heading text-fg">
        <Repeat className="size-5" aria-hidden />
        {t("substitutes.title")}
      </h3>

      <ul className="flex flex-col">
        {swaps.map((swap, i) => (
          <li key={swap.id}>
            {i > 0 ? <Separator className="my-2" /> : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-[length:var(--d-text-body)] text-fg">
                  {t("substitutes.who", {
                    name: swap.personName,
                    position: swap.positionName,
                  })}
                </span>
                {swap.reason ? (
                  <span className="text-caption text-fg-muted">{swap.reason}</span>
                ) : null}
              </span>

              <span className="flex flex-wrap items-center gap-1">
                <CoverDialog
                  church={church}
                  requestId={swap.id}
                  positionName={swap.positionName}
                  onPick={(personId, anyway) =>
                    run(() => putSomebodyIn(swap.id, personId, anyway, church))}
                />
                <IconButton
                  label={t("substitutes.cancel")}
                  disabled={pending}
                  onClick={() => run(() => closeSwap(swap.id, church))}
                >
                  <X />
                </IconButton>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CoverDialog({
  church,
  requestId,
  positionName,
  onPick,
}: {
  church: string;
  requestId: string;
  positionName: string;
  onPick: (personId: string, anyway: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [people, setPeople] = React.useState<PlanCandidate[] | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let live = true;
    whoCouldCover(requestId, church).then((found) => {
      if (live) setPeople(found);
    });
    return () => { live = false; };
  }, [open, requestId, church]);

  const warningOf = (candidate: PlanCandidate): string | null => {
    const w = candidate.warning;
    if (w.blockedOut) {
      return t("plan.warning.away", { from: w.blockedOut.startsOn, to: w.blockedOut.endsOn });
    }
    if (w.tooSoon) {
      return t("plan.warning.tooSoon", {
        day: w.tooSoon.lastServedOn,
        frequency: t(`frequency.${w.tooSoon.frequency}` as never),
      });
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">{t("substitutes.cover")}</Button>
      </DialogTrigger>
      <DialogContent title={positionName} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-2">
          {people !== null && people.length === 0 ? (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("plan.nobody")}</p>
          ) : null}

          {(people ?? []).map((candidate) => {
            const warning = warningOf(candidate);
            return (
              <button
                key={candidate.personId}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(candidate.personId, warning !== null);
                }}
                className="flex w-full flex-col gap-0.5 rounded-[var(--d-radius-control)] px-3 py-2 text-left hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <span className="text-[length:var(--d-text-body)] text-fg">{candidate.name}</span>
                {warning ? (
                  <span className="flex items-center gap-1.5 text-caption text-warning-text">
                    <TriangleAlert className="size-4" aria-hidden />
                    {warning}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
