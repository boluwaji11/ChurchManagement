"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, UserMinus, TriangleAlert, Link2 } from "lucide-react";
import {
  Banner, Badge, IconButton, Card, Separator,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import type { PlanCandidate } from "@connectapp/db";
import { schedule, unschedule, whoCouldFill } from "../../actions";

export interface Gathering {
  id: string;
  /** "Sunday, 4 October · First service 9:00am", already in the reader's locale. */
  label: string;
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
  /** R10.6. The link this person answers on, for sending by whatever a church uses. */
  token: string;
}

/**
 * R10.3. The schedule plan: one service, picked from the ones coming up.
 *
 * One at a time, because that is the unit a leader works in. They sit down to
 * fill this week's service, not to read a spreadsheet of six, and a screen that
 * shows six is a screen where the one they came for is below the fold.
 */
export function SchedulePlan({
  church,
  teamId,
  gatherings,
  chosen,
  positions,
  entries,
}: {
  church: string;
  teamId: string;
  gatherings: Gathering[];
  chosen: string;
  positions: PlanPosition[];
  entries: PlanEntry[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const choose = (id: string) => {
    router.push(`/serving/${teamId}/schedule?church=${church}&service=${id}`);
  };

  const take = (id: string) => {
    startTransition(async () => {
      const result = await unschedule(id, church);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  const put = (occurrenceId: string, positionId: string, memberId: string, anyway: boolean) => {
    startTransition(async () => {
      const result = await schedule(
        { occurrenceId, teamId, positionId, memberId, anyway },
        church,
      );
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  if (gatherings.length === 0) return <Empty icon="calendar" title={t("plan.empty")} />;

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("plan.failed")}>{error}</Banner> : null}

      <div className="flex flex-col gap-1.5">
        <span className="text-label text-fg">{t("plan.service")}</span>
        <Select value={chosen} onValueChange={choose}>
          <SelectTrigger aria-label={t("plan.service")} className="w-full sm:w-96">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {gatherings.map((gathering) => (
              <SelectItem key={gathering.id} value={gathering.id}>
                {gathering.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <ul className="flex flex-col">
          {positions.map((position, i) => {
            const filled = entries.filter(
              (e) => e.occurrenceId === chosen && e.positionId === position.id,
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
                      occurrenceId={chosen}
                      already={filled.map((e) => e.personName)}
                      onPick={(memberId, anyway) =>
                        put(chosen, position.id, memberId, anyway)}
                    />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
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
            <Empty icon="calendar" title={t("plan.nobody")} />
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
                </button>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * R10.6. The link that asks this person whether they can.
 *
 * Copied rather than sent, because messaging runs on the church's own provider
 * and that arrives later. A leader pastes it into whatever they already use.
 */
function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <IconButton
      label={copied ? t("plan.copied") : t("plan.copyLink")}
      onClick={() => {
        navigator.clipboard
          .writeText(`${window.location.origin}/serving/respond/${token}`)
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
