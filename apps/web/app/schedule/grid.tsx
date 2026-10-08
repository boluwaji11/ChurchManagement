"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Clock, XCircle, X, AlertTriangle, Plus, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Avatar, Banner, Button, Combobox, Input, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { schedule, unschedule, whoCouldFill, savePosition } from "./actions";
import type { PlanCandidate } from "@connectapp/db";
import { useFormError } from "@/lib/form-error";
import { Confirm } from "@/components/confirm";

export interface GridService {
  id: string;
  /** "Sun 5 Oct", as the column head reads. */
  label: string;
  /** The date it is filed under, which is what a blockout is checked against. */
  day: string;
  /**
   * R10.3. Whether this service has already happened.
   *
   * A rota is a plan, and a plan for last Tuesday is a record. Nobody is put
   * on a date that has gone: the column stays on the board so a leader can
   * read who served, and it takes nobody new.
   */
  past?: boolean;
}

export interface GridTeam {
  id: string;
  /** R10.1. What the team is called in the address the picker opens. */
  slug: string;
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
  /** R2.9. Their face, when the church has one for them. */
  photoUrl?: string | null;
  /**
   * R10.4. The dates in view this member has blocked out.
   *
   * The dates rather than a flag, because the roster has to say they are
   * away at all and the grid has to refuse the one day they are away on.
   */
  awayOn: string[];
}

/** R10.2. One more position on this team, from the bottom of its grid. */
function AddPosition({ church, teamId }: { church: string; teamId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();

  const close = () => {
    setOpen(false);
    setName("");
  };

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
        close();
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
          if (e.key === "Escape") close();
        }}
        aria-label={t("serving.position.name")}
        className="max-w-[260px]"
      />
      <Button onClick={save} disabled={pending || !name.trim()}>{t("action.add")}</Button>
      <Button variant="ghost" onClick={close}>{t("action.cancel")}</Button>
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
  closed,
  className,
}: {
  church: string;
  teamId: string;
  positionId: string;
  occurrenceId: string;
  onFilled: () => void;
  /** R10.3. A date that has gone. The slot reads as closed and takes nobody. */
  closed?: boolean;
  /** How the empty slot reads where it is a row rather than a cell. */
  className?: string;
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

  /* R10.3. A date that has gone says nothing. The grey ground under the
     whole column has already said it, and repeating it in every empty cell
     puts the same four words on screen twenty times. */
  if (closed) return <span className={cn("block min-h-9", className)} aria-hidden />;

  if (!open) {
    return (
      <button
        type="button"
        onClick={look}
        className={cn(
          "flex min-h-9 w-full cursor-pointer items-center rounded-sm px-2 text-left",
          "text-[12px] text-fg-subtle hover:bg-sunken hover:text-fg",
          className,
        )}
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

/** One column's worth of travel, which is what a press moves. */
const COLUMN = 150;

/**
 * R10.3, R24.6. Reaching the services that do not fit across the board.
 *
 * Six columns fit at a desk and a church with a weeknight meeting has ten in
 * a month, so the grid scrolls. A trackpad does it by itself and a mouse
 * does not, which is most of the churches this is built for, so the arrows
 * are there to be pressed. Each one appears only while there is something
 * that way, so a month that fits shows neither.
 */
function Reach({ to }: { to: React.RefObject<HTMLDivElement | null> }) {
  const [canGo, setCanGo] = React.useState({ back: false, on: false });

  React.useEffect(() => {
    const box = to.current;
    if (!box) return;

    const read = () => {
      const over = box.scrollWidth - box.clientWidth;
      setCanGo({ back: box.scrollLeft > 1, on: box.scrollLeft < over - 1 });
    };

    read();
    box.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    /* A team with more positions, or a month with more services, changes the
       width without anybody scrolling or resizing anything. */
    const watch = new ResizeObserver(read);
    watch.observe(box);
    return () => {
      box.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
      watch.disconnect();
    };
  }, [to]);

  const go = (by: number) => to.current?.scrollBy({ left: by, behavior: "smooth" });

  return (
    <>
      {canGo.back ? (
        <button
          type="button"
          aria-label={t("serving.earlierServices")}
          onClick={() => go(-COLUMN)}
          className="absolute left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line bg-surface text-fg shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:bg-sunken"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      ) : null}

      {canGo.on ? (
        <button
          type="button"
          aria-label={t("serving.laterServices")}
          onClick={() => go(COLUMN)}
          className="absolute right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line bg-surface text-fg shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:bg-sunken"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      ) : null}
    </>
  );
}

/** R10.6. What a reply looks like in a cell. */
const LOOK = {
  accepted: { icon: CheckCircle2, hue: "fern" },
  pending: { icon: Clock, hue: "amber" },
  declined: { icon: XCircle, hue: "rose" },
} as const;

/**
 * R10.6. Somebody already in a slot: the reply they gave, and the way to take
 * them out of it. The same block in the month grid and in a phone's list.
 */
function Filled({
  slot,
  pending,
  closed,
  onRemove,
}: {
  slot: GridSlot;
  pending: boolean;
  /** R10.3. A service that has gone. Who served is a record, so it is read-only. */
  closed?: boolean;
  /** Hands back the work, so the confirmation can wait on it. */
  onRemove: () => void | Promise<unknown>;
}) {
  const look = LOOK[slot.status ?? "pending"];

  return (
    <>
      <div
        className="flex items-center gap-1.5 rounded-sm px-2 py-1"
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
        {/* R24.x. Taking somebody off a rota withdraws a request they may
            already have answered, so it asks first. A service that has
            happened has nothing to withdraw: the name on it is who served. */}
        {closed ? null : (
        <Confirm
          title={t("serving.unscheduleTitle", { name: slot.personName ?? "" })}
          body={t("serving.unscheduleBody")}
          confirmLabel={t("serving.unschedule")}
          disabled={pending}
          onConfirm={onRemove}
          trigger={
            <button
              type="button"
              aria-label={t("serving.unschedule")}
              disabled={pending}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-sm text-fg-subtle hover:bg-surface hover:text-fg"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          }
        />
        )}
      </div>

      {slot.warning ? (
        <span className="flex items-center gap-1 text-[11px] font-medium leading-[14px] text-danger-text">
          <AlertTriangle className="size-3 shrink-0" aria-hidden />
          {slot.warning}
        </span>
      ) : null}
    </>
  );
}

/**
 * R10.3, R10.4. One team's month: a row per position, a column per service.
 *
 * A leader fills a schedule by looking across a month rather than one service at a
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
  onTeam: (slug: string) => void;
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

    /*
     * R10.4. A blockout is the one thing a member asked for in advance, and
     * scheduling over it sends a request they have already said no to. The
     * refusal names them and the date, because a drag that simply does
     * nothing reads as a drag that missed.
     */
    const onto = services.find((service) => service.id === occurrenceId);
    if (who && onto && who.awayOn.includes(onto.day)) {
      setOver(null);
      setError(t("serving.awayThatDay", { name: who.name, date: onto.label }));
      return;
    }

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

  /* The promise goes back to the confirmation, which keeps its button busy
     and the box open until the row has actually gone. */
  const take = async (assignmentId: string) => {
    const result = await unschedule(assignmentId, church);
    setError(result.error);
    router.refresh();
  };

  /*
   * R10.3, R24.6. A month of services across a phone is a spreadsheet nobody
   * can read, so a narrow screen fills one service at a time. Which one is
   * chosen at the top of the list.
   */
  const [one, setOne] = React.useState(services[0]?.id ?? "");
  const ids = services.map((service) => service.id).join(",");
  React.useEffect(() => {
    setOne((was) => (ids.split(",").includes(was) ? was : (ids.split(",")[0] ?? "")));
  }, [ids]);

  const needed = positions.reduce((n, position) => n + position.needed, 0);
  /** R10.3. The box the month grid scrolls inside, which the arrows move. */
  const scroller = React.useRef<HTMLDivElement>(null);
  /** R10.3. Whether the service the narrow view is showing has gone. */
  const gone = Boolean(services.find((service) => service.id === one)?.past);
  const filledFor = (occurrenceId: string) =>
    slots.filter((slot) => slot.occurrenceId === occurrenceId && slot.assignmentId).length;

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Combobox
          aria-label={t("serving.team")}
          className="w-full max-w-[320px]"
          options={teams.map((one) => ({ value: one.slug, label: one.name }))}
          value={team.slug}
          onChange={onTeam}
          emptyLabel={t("serving.noTeam")}
          clearLabel={t("date.clear")}
          clearable={false}
        />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="relative hidden min-w-0 flex-[999_1_560px] lg:block">
          {/* R10.3. A month with more than six services reaches the rest of
              them sideways. The arrows sit over the grid's own edges, so a
              reader who has not noticed the columns continue still has
              something to press. */}
          <Reach to={scroller} />

          <div
            ref={scroller}
            className="w-full overflow-x-auto rounded-lg border border-line bg-surface"
          >
          {/* R24.6. The grid and the row under it are one block as wide as
              the widest of them, so the footer reaches the far column rather
              than stopping where the window happens to end. */}
          <div className="w-max min-w-full">
          <div
            className="grid min-w-[760px]"
            style={{
              /* R10.3. A service column is at least 150px and as wide as its
                 heading needs. "November 8, 11:00 am" is the name of that
                 service and cutting it to "November 8, 11..." leaves two
                 columns reading the same. The names in the cells truncate,
                 so a long one does not drag the column out with it. */
              gridTemplateColumns: `150px repeat(${services.length}, minmax(auto, 1fr))`,
            }}
          >
            <div className="border-b border-line px-4 py-3 text-[12px] font-medium text-fg-subtle">
              {t("serving.position")}
            </div>

            {services.map((service) => {
              return (
                <div
                  key={service.id}
                  className={cn(
                    "flex min-w-[150px] items-baseline justify-between gap-2 border-b border-line border-l px-3 py-2.5",
                    service.past ? "border-l-line bg-sunken" : "border-l-sunken",
                  )}
                >
                  <span
                    className={cn(
                      "whitespace-nowrap font-semibold",
                      service.past ? "text-fg-subtle" : "text-fg",
                    )}
                  >
                    {service.label}
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
                  // A slot that has somebody in it takes no drop, and neither
                  // does a date that has gone.
                  const taken = Boolean(slot?.assignmentId) || Boolean(service.past);

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
                        "flex flex-col gap-1 border-b border-l p-2",
                        /* The rules are drawn in the ground's own colour, so a
                           past column on that ground needs the darker line or
                           the grid vanishes under it. */
                        service.past
                          ? "border-line border-l-line bg-sunken"
                          : "border-sunken border-l-sunken",
                        over === spot && "bg-primary-soft",
                      )}
                    >
                      {slot?.assignmentId && look ? (
                        <Filled
                          slot={slot}
                          pending={pending}
                          closed={service.past}
                          onRemove={() => take(slot.assignmentId!)}
                        />
                      ) : (
                        <FillSlot
                          church={church}
                          teamId={team.id}
                          positionId={position.id}
                          occurrenceId={service.id}
                          closed={service.past}
                          onFilled={() => router.refresh()}
                        />
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* R10.2. A position the schedule is missing, added where it is missed. */}
          {canManage ? <AddPosition church={church} teamId={team.id} /> : null}
          </div>
          </div>
        </section>

        {/* R10.3. The same month on a phone: one service, its positions down
            the page, and the service picked at the top. */}
        <section className="w-full overflow-hidden rounded-lg border border-line bg-surface lg:hidden">
          <div className="flex flex-col gap-2.5 border-b border-line p-4">
            <Combobox
              aria-label={t("serving.service")}
              options={services.map((service) => ({
                value: service.id,
                label: service.label,
              }))}
              value={one}
              onChange={setOne}
              emptyLabel={t("serving.noneThisMonth")}
              clearLabel={t("date.clear")}
              clearable={false}
            />
            <span
              data-numeric
              className="text-[13px] font-medium"
              style={
                gone
                  ? { color: "var(--color-fg-subtle)" }
                  : {
                      color:
                        filledFor(one) >= needed
                          ? "var(--hue-fern-key)"
                          : "var(--color-danger-text)",
                    }
              }
            >
              {t("serving.filledOf", { filled: filledFor(one), needed })}
            </span>
          </div>

          <ul className="flex flex-col">
            {positions.map((position) => {
              const slot = at.get(key(position.id, one));

              return (
                <li
                  key={position.id}
                  className="flex flex-col gap-1.5 border-b border-sunken px-4 py-3 last:border-0"
                >
                  <span className="text-[13px] font-medium text-fg">{position.name}</span>
                  {slot?.assignmentId ? (
                    <Filled
                      slot={slot}
                      pending={pending}
                      closed={gone}
                      onRemove={() => take(slot.assignmentId!)}
                    />
                  ) : (
                    <FillSlot
                      church={church}
                      teamId={team.id}
                      positionId={position.id}
                      occurrenceId={one}
                      closed={gone}
                      onFilled={() => router.refresh()}
                      className="rounded-md border border-dashed border-line-strong text-[13px] text-fg-muted"
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {canManage ? <AddPosition church={church} teamId={team.id} /> : null}
        </section>

        {/* R10.3. Who is on this team, with what they are already doing, so a
            leader spreads the load rather than asking the same four members. */}
        <aside className="flex flex-[1_1_240px] flex-col gap-2 rounded-lg border border-line bg-surface p-4 lg:sticky lg:top-[84px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate font-semibold text-fg">
              {t("serving.volunteers", { team: team.name })}
            </span>
            {/* Dragging is the month grid's way of filling a slot, and the
                month grid is not on a phone. */}
            <span className="hidden shrink-0 whitespace-nowrap text-[12px] text-fg-subtle lg:inline">
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
                <Avatar
                  name={one.name}
                  src={one.photoUrl}
                  id={one.memberId}
                  className="size-7 text-[11px] font-semibold"
                />
                <span className="min-w-0 flex-1 leading-4">
                  <span className="block truncate text-[13px] font-medium text-fg">
                    {one.name}
                  </span>
                  {/* R10.4. Only when there is something to say. Which dates
                      is the grid's business: the columns they cannot go in
                      refuse them. */}
                  {one.awayOn.length > 0 ? (
                    <span
                      className="block truncate text-[12px]"
                      style={{ color: "var(--hue-amber-key)" }}
                    >
                      {t("serving.notAvailable")}
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
