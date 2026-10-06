"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle, X, AlertTriangle, Plus } from "lucide-react";
import { Avatar, Banner, Button, Combobox, Input, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { schedule, unschedule, whoCouldFill, savePosition } from "./actions";
import type { PlanCandidate } from "@connectapp/db";
import { useFormError } from "@/lib/form-error";

export interface GridService {
  id: string;
  /** "Sun 5 Oct", as the column head reads. */
  label: string;
}

export interface GridTeam {
  id: string;
  name: string;
  hue: string;
  open: number;
}

export interface GridSlot {
  positionId: string;
  occurrenceId: string;
  assignmentId: string | null;
  personName: string | null;
  status: "accepted" | "pending" | "declined" | null;
  /** R10.4. What is wrong with this one: away that day, or doubled up. */
  warning: string | null;
}

export interface GridPosition {
  id: string;
  name: string;
  needed: number;
}

export interface GridVolunteer {
  memberId: string;
  name: string;
  /** How much they are already doing, or the day they are away. */
  note: string;
  away: boolean;
}

/** R10.2. One more position on this team, from the bottom of its grid. */
function AddPosition({ church, teamId }: { church: string; teamId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();

  const save = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await savePosition(
        null,
        { teamId, name: name.trim(), needed: 1, withChildren: false, requiresCheck: false },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setName("");
        setOpen(false);
        router.refresh();
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 border-t border-line bg-sunken px-4 py-3 text-left font-medium text-primary hover:bg-line"
      >
        <Plus className="size-4" aria-hidden /> {t("serving.addPosition")}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line bg-sunken px-4 py-3">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setOpen(false);
        }}
        aria-label={t("serving.position.name")}
        className="max-w-[260px]"
      />
      <Button onClick={save} disabled={pending || !name.trim()}>{t("action.add")}</Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>{t("action.cancel")}</Button>
      {error ? <span className="text-[12px] text-danger-text">{error}</span> : null}
    </div>
  );
}

/**
 * R10.3. Filling one slot.
 *
 * The list is this team's own members, with the ones who play this position
 * first, because a leader filling Drums is choosing between drummers.
 */
function FillSlot({
  church,
  teamId,
  positionId,
  occurrenceId,
  onFilled,
}: {
  church: string;
  teamId: string;
  positionId: string;
  occurrenceId: string;
  onFilled: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [who, setWho] = React.useState<PlanCandidate[]>([]);
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();

  const look = () => {
    setOpen(true);
    startTransition(async () => {
      setWho(await whoCouldFill({ teamId, positionId, occurrenceId }, church));
    });
  };

  const pick = (memberId: string) => {
    startTransition(async () => {
      const result = await schedule(
        { occurrenceId, teamId, positionId, memberId, anyway: true },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        onFilled();
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={look}
        className="w-full cursor-pointer rounded-sm px-1 py-0.5 text-left text-[12px] text-fg-subtle hover:bg-sunken hover:text-fg"
      >
        {t("serving.openSlot")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Combobox
        aria-label={t("serving.fill")}
        options={who.map((one) => ({
          value: one.memberId,
          label: one.name,
          keywords: one.plays ? t("serving.fill.plays") : undefined,
        }))}
        value=""
        onChange={pick}
        emptyLabel={t("serving.fill.none")}
        clearLabel={t("date.clear")}
        disabled={pending}
      />
      {error ? <span className="text-[11px] text-danger-text">{error}</span> : null}
    </div>
  );
}

/** R10.6. What a reply looks like in a cell. */
const LOOK = {
  accepted: { icon: CheckCircle2, hue: "fern" },
  pending: { icon: Clock, hue: "amber" },
  declined: { icon: XCircle, hue: "rose" },
} as const;

/**
 * R10.3, R10.4. One team's month: a row per position, a column per service.
 *
 * A leader fills a rota by looking across a month rather than one service at a
 * time, so the whole month is the screen and a volunteer is dragged from the
 * list beside it onto the slot they are taking.
 */
export function ScheduleGrid({
  church,
  teams,
  team,
  positions,
  services,
  slots,
  volunteers,
  canManage,
  onTeam,
}: {
  church: string;
  teams: GridTeam[];
  team: GridTeam;
  positions: GridPosition[];
  services: GridService[];
  slots: GridSlot[];
  volunteers: GridVolunteer[];
  /** Whether this person may change the team itself. */
  canManage: boolean;
  onTeam: (id: string) => void;
}) {
  const router = useRouter();
  const [dragging, setDragging] = React.useState<GridVolunteer | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const key = (positionId: string, occurrenceId: string) => `${positionId}:${occurrenceId}`;
  const at = new Map(slots.map((slot) => [key(slot.positionId, slot.occurrenceId), slot]));

  const drop = (positionId: string, occurrenceId: string) => {
    const who = dragging;
    setDragging(null);
    setOver(null);
    if (!who) return;

    startTransition(async () => {
      const result = await schedule(
        { occurrenceId, teamId: team.id, positionId, memberId: who.memberId, anyway: false },
        church,
      );
      setError(result.error);
      router.refresh();
    });
  };

  const take = (assignmentId: string) => {
    startTransition(async () => {
      const result = await unschedule(assignmentId, church);
      setError(result.error);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Combobox
          aria-label={t("serving.view.teams")}
          className="w-full max-w-[320px]"
          options={teams.map((one) => ({ value: one.id, label: one.name }))}
          value={team.id}
          onChange={onTeam}
          emptyLabel={t("serving.noTeam")}
          clearLabel={t("date.clear")}
          clearable={false}
        />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="flex-[999_1_560px] overflow-auto rounded-lg border border-line bg-surface">
          <div
            className="grid min-w-[760px]"
            style={{
              gridTemplateColumns: `150px repeat(${services.length}, minmax(150px, 1fr))`,
            }}
          >
            <div className="border-b border-line px-4 py-3 text-[12px] font-medium text-fg-subtle">
              {t("serving.position")}
            </div>

            {services.map((service) => {
              const filled = slots.filter(
                (slot) => slot.occurrenceId === service.id && slot.assignmentId,
              ).length;
              const needed = positions.reduce((n, position) => n + position.needed, 0);

              return (
                <div
                  key={service.id}
                  className="flex items-baseline justify-between gap-2 border-b border-line border-l border-l-sunken px-3 py-2.5"
                >
                  <span className="min-w-0 truncate font-semibold text-fg">{service.label}</span>
                  <span
                    className="shrink-0 text-[12px] font-medium"
                    style={{
                      color:
                        filled >= needed ? "var(--hue-fern-key)" : "var(--color-danger-text)",
                    }}
                  >
                    {filled} / {needed}
                  </span>
                </div>
              );
            })}

            {positions.map((position) => (
              <React.Fragment key={position.id}>
                <div className="flex items-center border-b border-sunken px-4 py-3 text-[13px] font-medium text-fg">
                  {position.name}
                </div>

                {services.map((service) => {
                  const slot = at.get(key(position.id, service.id));
                  const spot = key(position.id, service.id);
                  const look = slot?.status ? LOOK[slot.status] : null;
                  // A slot that already has somebody in it takes no drop. The
                  // way to put a different person there is to take this one
                  // out first, which is the same thing a church would say.
                  const taken = Boolean(slot?.assignmentId);

                  return (
                    <div
                      key={service.id}
                      onDragOver={(e) => {
                        if (taken) return;
                        e.preventDefault();
                        setOver(spot);
                      }}
                      onDragLeave={() => setOver((was) => (was === spot ? null : was))}
                      onDrop={() => {
                        if (taken) return;
                        drop(position.id, service.id);
                      }}
                      className={cn(
                        "flex flex-col gap-1 border-b border-sunken border-l border-l-sunken p-2",
                        over === spot && "bg-primary-soft",
                      )}
                    >
                      {slot?.assignmentId && look ? (
                        <>
                          <div
                            className="flex items-center gap-1.5 rounded-sm px-2 py-1.5"
                            style={{ background: `var(--hue-${look.hue}-tint)` }}
                          >
                            <look.icon
                              className="size-3.5 shrink-0"
                              style={{ color: `var(--hue-${look.hue}-key)` }}
                              aria-hidden
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-[13px] font-medium text-fg",
                                slot.status === "declined" && "line-through",
                              )}
                            >
                              {slot.personName}
                            </span>
                            <button
                              type="button"
                              aria-label={t("serving.unschedule")}
                              disabled={pending}
                              onClick={() => take(slot.assignmentId!)}
                              className="grid size-5 place-items-center rounded-sm text-fg-subtle hover:bg-surface hover:text-fg"
                            >
                              <X className="size-3" aria-hidden />
                            </button>
                          </div>

                          {slot.warning ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium leading-[14px] text-danger-text">
                              <AlertTriangle className="size-3 shrink-0" aria-hidden />
                              {slot.warning}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <FillSlot
                          church={church}
                          teamId={team.id}
                          positionId={position.id}
                          occurrenceId={service.id}
                          onFilled={() => router.refresh()}
                        />
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* R10.2. A position the rota is missing, added where it is missed. */}
          {canManage ? <AddPosition church={church} teamId={team.id} /> : null}
        </section>

        {/* R10.3. Who is on this team, with what they are already doing, so a
            leader spreads the load rather than asking the same four members. */}
        <aside className="flex flex-[1_1_240px] flex-col gap-2 rounded-lg border border-line bg-surface p-4 lg:sticky lg:top-[84px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate font-semibold text-fg">
              {t("serving.volunteers", { team: team.name })}
            </span>
            <span className="shrink-0 whitespace-nowrap text-[12px] text-fg-subtle">
              {t("serving.dragOnto")}
            </span>
          </div>

          {volunteers.length === 0 ? (
            <p className="text-[13px] text-fg-muted">{t("serving.roster.empty")}</p>
          ) : (
            volunteers.map((one) => (
              <div
                key={one.memberId}
                draggable
                onDragStart={(e) => {
                  setDragging(one);
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", one.memberId);
                }}
                onDragEnd={() => setDragging(null)}
                className="flex cursor-grab items-center gap-2.5 rounded-md border border-line bg-canvas px-2.5 py-2"
              >
                <Avatar name={one.name} id={one.memberId} className="size-7 text-[11px] font-semibold" />
                <span className="min-w-0 flex-1 leading-4">
                  <span className="block truncate text-[13px] font-medium text-fg">
                    {one.name}
                  </span>
                  {/* R10.4. Only when there is something to say: the day they
                      are away. */}
                  {one.away ? (
                    <span
                      className="block truncate text-[12px]"
                      style={{ color: "var(--hue-amber-key)" }}
                    >
                      {one.note}
                    </span>
                  ) : null}
                </span>
              </div>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
