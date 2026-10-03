"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, UserMinus, TriangleAlert } from "lucide-react";
import {
  Banner, Badge, IconButton, Card, EmptyState, Separator,
  Dialog, DialogTrigger, DialogContent,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { PlanCandidate } from "@hearth/db";
import { schedule, unschedule, whoCouldFill } from "../../actions";

export interface Gathering {
  id: string;
  name: string;
  day: string;
  time: string;
}

export interface PlanPosition {
  id: string;
  name: string;
  needed: number;
}

export interface PlanEntry {
  id: string;
  occurrenceId: string;
  positionId: string;
  personName: string;
  status: string;
  overridden: boolean;
}

/**
 * R10.3. The schedule plan, one gathering at a time.
 *
 * A gathering rather than a grid, because that is the unit a leader works in:
 * they sit down to fill one service, not to read a spreadsheet of six.
 */
export function SchedulePlan({
  church,
  teamId,
  gatherings,
  positions,
  entries,
}: {
  church: string;
  teamId: string;
  gatherings: Gathering[];
  positions: PlanPosition[];
  entries: PlanEntry[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const take = (id: string) => {
    startTransition(async () => {
      const result = await unschedule(id, church);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  const put = (occurrenceId: string, positionId: string, personId: string, anyway: boolean) => {
    startTransition(async () => {
      const result = await schedule(
        { occurrenceId, teamId, positionId, personId, anyway },
        church,
      );
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  if (gatherings.length === 0) return <EmptyState title={t("plan.empty")} />;

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("plan.failed")}>{error}</Banner> : null}

      {gatherings.map((gathering) => (
        <Card key={gathering.id} className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 className="font-display text-heading text-fg">{gathering.day}</h3>
            <span className="text-caption text-fg-muted">
              {gathering.name} {gathering.time}
            </span>
          </div>

          <ul className="flex flex-col">
            {positions.map((position, i) => {
              const filled = entries.filter(
                (e) => e.occurrenceId === gathering.id && e.positionId === position.id,
              );
              return (
                <li key={position.id}>
                  {i > 0 ? <Separator className="my-2" /> : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="text-[length:var(--d-text-body)] text-fg">
                        {position.name}
                      </span>
                      <span
                        className={`text-caption tabular-nums ${
                          filled.length < position.needed ? "text-danger-text" : "text-fg-muted"
                        }`}
                      >
                        {t("plan.filled", {
                          filled: filled.length,
                          needed: position.needed,
                        })}
                      </span>
                    </span>

                    <span className="flex flex-wrap items-center gap-2">
                      {filled.map((entry) => (
                        <span key={entry.id} className="flex items-center gap-1">
                          <span className="text-[length:var(--d-text-body)] text-fg">
                            {entry.personName}
                          </span>
                          {entry.status === "declined" ? (
                            <Badge tone="danger">{t("plan.status.declined")}</Badge>
                          ) : entry.status === "accepted" ? (
                            <Badge tone="success">{t("plan.status.accepted")}</Badge>
                          ) : null}
                          {entry.overridden ? (
                            <TriangleAlert
                              className="size-4 text-warning-text"
                              aria-label={t("plan.overridden")}
                            />
                          ) : null}
                          <IconButton
                            label={t("plan.remove")}
                            disabled={pending}
                            onClick={() => take(entry.id)}
                          >
                            <UserMinus />
                          </IconButton>
                        </span>
                      ))}

                      <AddDialog
                        church={church}
                        teamId={teamId}
                        positionId={position.id}
                        positionName={position.name}
                        occurrenceId={gathering.id}
                        already={filled.map((e) => e.personName)}
                        onPick={(personId, anyway) =>
                          put(gathering.id, position.id, personId, anyway)}
                      />
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/** R10.3 to R10.5. Who could fill the slot, and what the scheduler should know. */
function AddDialog({
  church,
  teamId,
  positionId,
  positionName,
  occurrenceId,
  already,
  onPick,
}: {
  church: string;
  teamId: string;
  positionId: string;
  positionName: string;
  occurrenceId: string;
  already: string[];
  onPick: (personId: string, anyway: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [people, setPeople] = React.useState<PlanCandidate[] | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let live = true;
    whoCouldFill({ teamId, positionId, occurrenceId }, church).then((found) => {
      if (live) setPeople(found);
    });
    return () => { live = false; };
  }, [open, teamId, positionId, occurrenceId, church]);

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
        <IconButton label={t("plan.add")}><Plus /></IconButton>
      </DialogTrigger>
      <DialogContent title={positionName} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-2">
          {people !== null && people.length === 0 ? (
            <EmptyState title={t("plan.nobody")} />
          ) : null}

          {(people ?? [])
            .filter((candidate) => !already.includes(candidate.name))
            .map((candidate) => {
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
                  <span className="flex items-center gap-2">
                    <span className="text-[length:var(--d-text-body)] text-fg">
                      {candidate.name}
                    </span>
                    {candidate.plays ? (
                      <Badge tone="neutral">{t("plan.plays")}</Badge>
                    ) : null}
                  </span>
                  {warning ? (
                    <span className="flex items-center gap-1.5 text-caption text-warning-text">
                      <TriangleAlert className="size-4" aria-hidden />
                      {warning}
                    </span>
                  ) : null}
                  {/* R10.3. Where else they are at that hour. Serving in two
                      places at once is allowed, so this is information. */}
                  {candidate.alsoOn ? (
                    <span className="text-caption text-fg-muted">
                      {t("plan.alsoOn", {
                        team: candidate.alsoOn.teamName,
                        position: candidate.alsoOn.positionName,
                      })}
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
