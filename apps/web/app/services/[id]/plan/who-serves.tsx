"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, UserMinus, TriangleAlert, Link2 } from "lucide-react";
import {
  Banner, Badge, Card, IconButton, Separator,
  Dialog, DialogTrigger, DialogContent,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import type { PlanCandidate } from "@connectapp/db";
import { schedule, unschedule, whoCouldFill } from "../../../schedule/actions";

export interface ServingEntry {
  assignmentId: string;
  memberId: string;
  personName: string;
  status: string;
  overridden: boolean;
  token: string;
}

export interface ServingPosition {
  id: string;
  name: string;
  needed: number;
  entries: ServingEntry[];
  short: number;
}

export interface ServingTeam {
  id: string;
  name: string;
  hue: string;
  positions: ServingPosition[];
}

/**
 * R11.9. Who serves, on the plan.
 *
 * This writes through the same actions the serving pages use, so a name put
 * down here is the same request, answered on the same link. A declined request
 * leaves the position short and the count says so, because a leader reading the
 * plan on a service morning is reading it to find the gaps.
 */
export function WhoServes({
  church,
  occurrenceId,
  teams,
}: {
  church: string;
  occurrenceId: string;
  teams: ServingTeam[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  const short = teams.reduce(
    (count, team) => count + team.positions.reduce((n, p) => n + p.short, 0),
    0,
  );

  return (
    <Card className="flex flex-col gap-3 p-5" aria-busy={pending}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-display text-heading text-fg">{t("serves.title")}</span>
        {short > 0 ? (
          <span className="text-caption text-danger-text tabular-nums">
            {plural("serves.short", short)}
          </span>
        ) : null}
      </div>

      {error ? <Banner tone="danger" title={t("plan.failed")}>{error}</Banner> : null}

      {teams.length === 0 ? (
        <Empty icon="serving" title={t("serves.empty")}
          body={t("serves.empty.body")} />
      ) : (
        <div className="flex flex-col gap-5">
          {teams.map((team) => (
            <div key={team.id} className="flex flex-col gap-2">
              <span className="flex items-center gap-2">
                <span className="text-label text-fg">{team.name}</span>
              </span>

              <ul className="flex flex-col">
                {team.positions.map((position, i) => (
                  <li key={position.id}>
                    {i > 0 ? <Separator className="my-2" /> : null}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex flex-wrap items-center gap-3">
                        <span className="text-[length:var(--d-text-body)] text-fg">
                          {position.name}
                        </span>
                        <span
                          className={`text-caption tabular-nums ${
                            position.short > 0 ? "text-danger-text" : "text-fg-muted"
                          }`}
                        >
                          {t("plan.filled", {
                            filled: position.needed - position.short,
                            needed: position.needed,
                          })}
                        </span>
                      </span>

                      <span className="flex flex-wrap items-center gap-2">
                        {position.entries.map((entry) => (
                          <span key={entry.assignmentId} className="flex items-center gap-1">
                            <span className="text-[length:var(--d-text-body)] text-fg">
                              {entry.personName}
                            </span>
                            {entry.status === "declined" ? (
                              <Badge tone="danger">{t("plan.status.declined")}</Badge>
                            ) : entry.status === "accepted" ? (
                              <Badge tone="success">{t("plan.status.accepted")}</Badge>
                            ) : (
                              <Badge tone="neutral">{t("plan.status.pending")}</Badge>
                            )}
                            {entry.overridden ? (
                              <TriangleAlert
                                className="size-4 text-warning-text"
                                aria-label={t("plan.overridden")}
                              />
                            ) : null}
                            <CopyLink token={entry.token} />
                            <IconButton
                              label={t("plan.remove")}
                              disabled={pending}
                              onClick={() => run(() => unschedule(entry.assignmentId, church))}
                            >
                              <UserMinus />
                            </IconButton>
                          </span>
                        ))}

                        <PickDialog
                          church={church}
                          teamId={team.id}
                          positionId={position.id}
                          positionName={position.name}
                          occurrenceId={occurrenceId}
                          already={position.entries.map((e) => e.personName)}
                          onPick={(memberId, anyway) =>
                            run(() =>
                              schedule(
                                {
                                  occurrenceId,
                                  teamId: team.id,
                                  positionId: position.id,
                                  memberId,
                                  anyway,
                                },
                                church,
                              ),
                            )}
                        />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** R10.3 to R10.5. Who could fill the slot, and what the leader should know. */
function PickDialog({
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
  onPick: (memberId: string, anyway: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [members, setPeople] = React.useState<PlanCandidate[] | null>(null);

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
          {members !== null && members.length === 0 ? (
            <Empty icon="serving" title={t("plan.nobody")} />
          ) : null}

          {(members ?? [])
            .filter((candidate) => !already.includes(candidate.name))
            .map((candidate) => {
              const warning = warningOf(candidate);
              return (
                <button
                  key={candidate.memberId}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onPick(candidate.memberId, warning !== null);
                  }}
                  className="flex w-full flex-col gap-0.5 rounded-[var(--d-radius-control)] px-3 py-2 text-left hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[length:var(--d-text-body)] text-fg">
                      {candidate.name}
                    </span>
                    {candidate.plays ? <Badge tone="neutral">{t("plan.plays")}</Badge> : null}
                  </span>
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

/** R10.6. The link that asks this person whether they can. */
function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <IconButton
      label={copied ? t("plan.copied") : t("plan.copyLink")}
      onClick={() => {
        navigator.clipboard
          .writeText(`${window.location.origin}/schedule/respond/${token}`)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => setCopied(false));
      }}
    >
      <Link2 />
    </IconButton>
  );
}
