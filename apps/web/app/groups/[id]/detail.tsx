"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Lock, LockOpen, PencilLine, X } from "lucide-react";
import {
  Avatar, Banner, Button, IconButton, Spinner, Dialog, DialogContent, DialogFooter,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import type { Meeting, MeetingPerson } from "@connectapp/db";
import { Markdown } from "@/components/markdown";
import { decide, setOpenToJoin, leave, publishGroup } from "../actions";
import { AddMember } from "../add-member";
import { Picker } from "@/components/picker";
import { record, open as openMeeting } from "./meeting-actions";
import { useFormError } from "@/lib/form-error";

export interface DetailMeeting {
  /** The day, as YYYY-MM-DD. */
  on: string;
  mon: string;
  day: string;
  when: string;
  /** Only a past meeting offers the register. */
  canTake: boolean;
}

export interface DetailMember {
  memberId: string;
  name: string;
  role: string;
}

export interface DetailRequest {
  id: string;
  personName: string;
}

/**
 * R9.x. A group's own page, under the heading.
 *
 * Built to docs/redesign/design: the line saying whether it is taking members,
 * three tabs, and under Overview the description, what is coming, what has
 * happened, and a column of facts down the right.
 */
export function GroupDetail({
  church,
  groupId,
  groupName,
  canManage,
  canRecord,
  openToJoin,
  hue,
  join,
  about,
  upcoming,
  past,
  categories,
  schedule,
  leaders,
  location,
  directions,
  status,
  requests,
  members,
  meeting,
  attendees,
  attendanceDate,
  attendanceDays,
}: {
  church: string;
  groupId: string;
  groupName: string;
  canManage: boolean;
  /** R9.7. Whether this reader may record who came. */
  canRecord: boolean;
  openToJoin: boolean;
  /** The group kind's colour, which its dates wear. */
  hue: string;
  /** R9.5. Asking to come, where this reader may. */
  join?: React.ReactNode;
  about: string | null;
  upcoming: DetailMeeting[];
  past: DetailMeeting[];
  categories: { k: string; v: string }[];
  schedule: string | null;
  leaders: string[];
  location: string | null;
  /** R9.2. Google Maps, where the address is one a map can find. */
  directions: string | null;
  /** R9.5. "draft" while the open web cannot see it yet. */
  status: "draft" | "published";
  requests: DetailRequest[];
  members: DetailMember[];
  meeting: Meeting | null;
  attendees: MeetingPerson[];
  attendanceDate: string;
  /** R9.7. The meetings a register can be opened for, newest first. */
  attendanceDays: { on: string; label: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState("overview");
  const [removing, setRemoving] = React.useState<DetailMember | null>(null);
  const [error, setError] = useFormError(removing);
  const [deciding, setDeciding] = React.useState<(DetailRequest & { approve: boolean }) | null>(
    null,
  );
  const [pending, startTransition] = React.useTransition();
  /*
   * Which action is running. The two requests and the roster are asked about
   * in a dialog that closes first, so the row's own control carries the wait.
   */
  const [doing, setDoing] = React.useState<string>();

  React.useEffect(() => {
    if (!pending) setDoing(undefined);
  }, [pending]);

  /** R9.3. Who runs it, which decides what the chips say and who may come off. */
  const leading = members.filter((one) => one.role !== "member");

  const run = (key: string, work: () => Promise<{ error?: string }>) => {
    setDoing(key);
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      {/* R9.4. Where the group stands, in one line: whether the open web can see
          it, and whether it is taking members. The state is a mark with its own
          colour and its own icon, and the two presses that change it sit at the
          far end, so reading it and changing it are not the same gesture. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-[18px] py-3">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold"
          style={{
            background:
              status === "draft"
                ? "color-mix(in oklch, var(--hue-amber-500) 16%, transparent)"
                : openToJoin
                  ? "color-mix(in oklch, var(--hue-fern-500) 16%, transparent)"
                  : "var(--color-sunken)",
            color:
              status === "draft"
                ? "var(--hue-amber-key)"
                : openToJoin
                  ? "var(--hue-fern-key)"
                  : "var(--color-fg-muted)",
          }}
        >
          {status === "draft" ? (
            <PencilLine className="size-4" aria-hidden />
          ) : openToJoin ? (
            <Globe className="size-4" aria-hidden />
          ) : (
            <Lock className="size-4" aria-hidden />
          )}
          {status === "draft"
            ? t("group.draftText")
            : openToJoin ? t("group.openText") : t("group.closedText")}
        </span>

        {join ? <span className="ml-auto">{join}</span> : null}

        {canManage ? (
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {status === "published" ? (
              /* Drawn as the product draws anything it is pressed by: purple,
                 underlined under the pointer. */
              <Button
                variant="ghost"
                loading={doing === "openToJoin"}
                disabled={pending}
                onClick={() => run("openToJoin", () => setOpenToJoin(groupId, !openToJoin, church))}
                className="h-[34px] min-h-0 px-2.5 text-[13px] font-medium text-primary hover:underline hover:decoration-primary hover:underline-offset-[3px]"
              >
                {openToJoin ? <Lock /> : <LockOpen />}
                {openToJoin ? t("group.close") : t("group.open")}
              </Button>
            ) : null}

            {/* R9.4. Published says where the group stands, and says what the
                press does once somebody is over it. A button whose only word is
                the undoing of the state reads as the state itself. */}
            <Button
              variant={status === "draft" ? "primary" : "ghost"}
              loading={doing === "publish"}
              disabled={pending}
              onClick={() =>
                run("publish", () =>
                  publishGroup(groupId, status === "draft" ? "published" : "draft", church),
                )}
              className={
                status === "draft"
                  ? "h-[34px] min-h-0 px-2.5 text-[13px]"
                  : "group/pub h-[34px] min-h-0 px-2.5 text-[13px] font-medium hover:underline hover:underline-offset-[3px]"
              }
              /* Published is a state the church is pleased about, so it is the
                 same green the open badge wears. */
              style={status === "published" ? { color: "var(--hue-fern-key)" } : undefined}
            >
              {status === "draft" ? (
                <>
                  <Globe /> {t("group.publish")}
                </>
              ) : (
                <>
                  <Globe className="group-hover/pub:hidden group-focus-visible/pub:hidden" />
                  <PencilLine className="hidden group-hover/pub:block group-focus-visible/pub:block" />
                  <span className="group-hover/pub:hidden group-focus-visible/pub:hidden">
                    {t("group.published")}
                  </span>
                  <span className="hidden group-hover/pub:inline group-focus-visible/pub:inline">
                    {t("group.unpublish")}
                  </span>
                </>
              )}
            </Button>
          </div>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {/* R3.1. A member reads what the group is and asks to join it, so they
            have the one screen and no bar over it: a row of tabs with a single
            tab in it names a choice nobody has. */}
        {canRecord ? (
          <TabsList>
            <TabsTrigger value="overview">{t("group.tab.overview")}</TabsTrigger>
            <TabsTrigger value="members">{t("group.tab.members")}</TabsTrigger>
            <TabsTrigger value="attendance">{t("group.tab.attendance")}</TabsTrigger>
          </TabsList>
        ) : null}

        <TabsContent value="overview">
          <div className="flex flex-wrap items-stretch gap-10">
            <div className="flex min-w-0 flex-[2_1_440px] flex-col gap-7">
              {about ? (
                <section className="flex flex-col gap-2.5">
                  <h2 className="font-display text-[24px] font-normal text-fg">
                    {t("group.about", { name: "" }).trim()}
                  </h2>
                  <Markdown
                    text={about}
                    className="flex max-w-[68ch] flex-col gap-3 text-[15px] leading-6 text-fg"
                  />
                </section>
              ) : null}

              <MeetingList
                title={plural("group.upcoming", upcoming.length)}
                rows={upcoming}
                hue={hue}
                onTake={() => setTab("attendance")}
              />
              <MeetingList
                title={plural("group.past", past.length)}
                rows={past}
                hue={hue}
                onTake={() => setTab("attendance")}
              />
            </div>

            <aside className="flex flex-[1_1_320px] flex-col gap-6 md:border-l md:border-line md:pl-10">
              {categories.length > 0 ? (
                <Facts label={t("group.categories")}>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((one) => (
                      <span key={one.k} className="rounded-md bg-sunken px-2.5 py-1 text-[13px] text-fg">
                        <strong className="font-semibold">{one.k}:</strong> {one.v}
                      </span>
                    ))}
                  </div>
                </Facts>
              ) : null}

              {schedule ? <Facts label={t("group.schedule")}><span>{schedule}</span></Facts> : null}
              {leaders.length > 0 ? (
                <Facts label={t("group.leader")}><span>{leaders.join(", ")}</span></Facts>
              ) : null}
              {location ? (
                <Facts label={t("group.location")}>
                  <span className="whitespace-pre-line">{location}</span>
                  {directions ? (
                    <a
                      href={directions}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {t("common.directions")}
                    </a>
                  ) : null}
                </Facts>
              ) : null}

              {canManage ? (
                <div className="flex flex-col gap-2 border-t border-line pt-5">
                  <span className="text-[12px] font-bold tracking-[0.06em] text-fg-subtle uppercase">
                    {t("group.requests")}
                  </span>
                  {requests.length === 0 ? (
                    <span className="text-[13px] text-fg-muted">{t("group.noRequests")}</span>
                  ) : (
                    requests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium text-fg">
                          {request.personName}
                        </span>
                        <IconButton
                          label={t("find.approve")}
                          variant="secondary"
                          disabled={pending}
                          onClick={() => setDeciding({ ...request, approve: true })}
                        >
                          {doing === `decide:${request.id}:yes` ? (
                            <Spinner label={t("find.approve")} />
                          ) : (
                            <Check />
                          )}
                        </IconButton>
                        <IconButton
                          label={t("find.decline")}
                          variant="secondary"
                          disabled={pending}
                          onClick={() => setDeciding({ ...request, approve: false })}
                        >
                          {doing === `decide:${request.id}:no` ? (
                            <Spinner label={t("find.decline")} />
                          ) : (
                            <X />
                          )}
                        </IconButton>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </aside>
          </div>
        </TabsContent>

        {canRecord ? (
        <TabsContent value="members">
          <div className="flex max-w-[680px] flex-col gap-4">
            {/* Adding somebody sits above the list, because that is the one
                thing this tab is opened to do. */}
            {canManage ? <AddMember church={church} groupId={groupId} /> : null}

            <section className="overflow-hidden rounded-lg border border-line bg-surface">
              {members.map((member) => (
                <div
                  key={member.memberId}
                  className="flex min-h-[56px] items-center gap-3 border-b border-sunken px-5 last:border-b-0"
                >
                  <Avatar
                    name={member.name}
                    id={member.memberId}
                    className="size-[34px] text-[12px] font-semibold"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">
                    {member.name}
                  </span>

                  {/* What they are and the way to take them off, as one pair. */}
                  <span className="flex items-center gap-1.5">
                    {member.role === "member" ? null : (
                      <span className="rounded-md bg-sunken px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] text-fg-muted uppercase">
                        {/* Co-leader only means something where there is more
                            than one. One person running a group is its leader. */}
                        {t(
                          (leading.length > 1
                            ? `groups.role.${member.role}`
                            : "groups.role.leader") as never,
                        )}
                      </span>
                    )}
                    {canRecord ? (
                      <IconButton
                        label={t("groups.remove")}
                        variant="ghost"
                        disabled={
                          pending || (member.role !== "member" && leading.length === 1)
                        }
                        onClick={() => setRemoving(member)}
                      >
                        {doing === `leave:${member.memberId}` ? (
                          <Spinner label={t("groups.remove")} />
                        ) : (
                          <X />
                        )}
                      </IconButton>
                    ) : null}
                  </span>
                </div>
              ))}
            </section>
          </div>
        </TabsContent>
        ) : null}

        {canRecord ? (
          <TabsContent value="attendance">
            <Register
              church={church}
              groupId={groupId}
              meeting={meeting}
              attendees={attendees}
              date={attendanceDate}
              days={attendanceDays}
            />
          </TabsContent>
        ) : null}
      </Tabs>

      {/* R9.6. Letting somebody in, or turning them down. Both are answers the
          person on the other side will see, so both are asked about first. */}
      <Dialog open={deciding !== null} onOpenChange={(open) => (open ? null : setDeciding(null))}>
        <DialogContent
          alert={deciding?.approve === false}
          title={
            deciding?.approve
              ? t("find.approveTitle", { name: deciding.personName, group: groupName })
              : t("find.declineTitle", { name: deciding?.personName ?? "" })
          }
          closeLabel={t("common.close")}
        >
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeciding(null)}>{t("action.cancel")}</Button>
            <Button
              variant={deciding?.approve ? "primary" : "danger"}
              onClick={() => {
                const asked = deciding;
                setDeciding(null);
                if (asked) {
                  run(`decide:${asked.id}:${asked.approve ? "yes" : "no"}`, () =>
                    decide(asked.id, asked.approve, church),
                  );
                }
              }}
            >
              {t(deciding?.approve ? "find.approve" : "find.decline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Taking somebody off a roster asks first, the same as every other x. */}
      <Dialog open={removing !== null} onOpenChange={(open) => (open ? null : setRemoving(null))}>
        <DialogContent alert title={t("groups.removeTitle")} closeLabel={t("common.close")}>
          <p className="text-[length:var(--d-text-body)] text-fg">
            {t("groups.removeBody", { name: removing?.name ?? "" })}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>{t("action.cancel")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                const who = removing;
                setRemoving(null);
                if (who) run(`leave:${who.memberId}`, () => leave(groupId, who.memberId, church));
              }}
            >
              {t("groups.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Facts({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold tracking-[0.06em] text-fg-subtle uppercase">
        {label}
      </span>
      <span className="text-[length:var(--d-text-body)] text-fg">{children}</span>
    </div>
  );
}

/**
 * A date tile, the day it falls on, and the register where it has happened.
 *
 * The tiles wear the group's own colour and are joined by a thread down their
 * centres, so three dates read as one series rather than three cards that
 * happen to be stacked.
 */
function MeetingList({
  title,
  rows,
  hue,
  onTake,
}: {
  title: string;
  rows: DetailMeeting[];
  hue: string;
  onTake: () => void;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-1">
      <h2 className="mb-1.5 font-display text-[22px] font-normal text-fg">{title}</h2>

      <div className="relative flex flex-col">
        {/* Behind the tiles, from the first centre to the last, with a dot in
            each gap so the thread reads as a series of stops rather than one
            long rule. Each row is 64px tall: a 52px tile with 6px above and
            below, so the gaps fall at a fixed pitch. */}
        {rows.length > 1 ? (
          <>
            <span
              aria-hidden
              className="absolute top-[38px] bottom-[38px] left-[27px] w-0.5 rounded-full"
              style={{ background: `var(--hue-${hue}-500)`, opacity: 0.45 }}
            />
            {rows.slice(1).map((row, i) => (
              <span
                key={`dot${row.on}`}
                aria-hidden
                className="absolute left-[25px] size-[6px] rounded-full"
                style={{
                  top: `${76 * (i + 1) - 3}px`,
                  background: `var(--hue-${hue}-500)`,
                }}
              />
            ))}
          </>
        ) : null}

        {rows.map((row) => (
          <div key={row.on} className="relative flex items-center gap-3.5 py-3">
            <div
              className="flex h-[52px] w-[56px] shrink-0 flex-col items-center justify-center rounded-[8px]"
              style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
            >
              <span className="text-[12px] font-semibold tracking-[0.06em] uppercase opacity-80 sm:text-[10px]">
                {row.mon}
              </span>
              <span className="font-display text-[19px] leading-[21px]">{row.day}</span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span className="font-semibold text-fg">{row.when}</span>
              {row.canTake ? (
                <Button
                  variant="secondary"
                  onClick={onTake}
                  className="h-8 min-h-0 px-3 text-[13px] whitespace-nowrap"
                >
                  {t("group.takeAttendance")}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * R9.7. The register.
 *
 * Everybody starts present, because a group of twelve usually has ten there and
 * the work is naming who was missing. Four taps and a save.
 */
function Register({
  church,
  groupId,
  meeting: first,
  attendees: firstAttendees,
  date,
  days,
}: {
  church: string;
  groupId: string;
  meeting: Meeting | null;
  attendees: MeetingPerson[];
  date: string;
  days: { on: string; label: string }[];
}) {
  const [day, setDay] = React.useState(days[0]?.on ?? "");
  const [meeting, setMeeting] = React.useState(first);
  const [members, setPeople] = React.useState(firstAttendees);
  const [error, setError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  /** Everybody present unless the day has been recorded before. */
  const fill = React.useCallback((rows: MeetingPerson[], was: Meeting | null) => {
    const recorded = (was?.present ?? 0) > 0 || (was?.notHeld ?? false);
    return Object.fromEntries(rows.map((p) => [p.memberId, recorded ? p.present : true]));
  }, []);

  const [here, setHere] = React.useState<Record<string, boolean>>(() => fill(firstAttendees, first));

  /** R9.7. A leader who missed last week opens the week they missed. */
  const load = (next: string) => {
    // The register is always for a day. An empty answer is the field being
    // cleared, which is not a question this one asks.
    if (!next) return;
    setDay(next);
    setSaved(false);
    startTransition(async () => {
      const result = await openMeeting(groupId, next, church);
      setError(result.error);
      if (result.meeting && result.members) {
        setMeeting(result.meeting);
        setPeople(result.members);
        setHere(fill(result.members, result.meeting));
      }
    });
  };

  const count = members.filter((p) => here[p.memberId]).length;
  const shownDate = days.find((one) => one.on === day)?.label ?? date;

  /*
   * R9.7. Every tap is written.
   *
   * A leader standing in a doorway with their coat on taps four names and
   * walks off. A save button at the bottom of that is a button nobody presses,
   * and the register silently keeps nothing. The whole list goes with each
   * write, so two quick taps settle on the second rather than racing.
   */
  const mark = (memberId: string) => {
    const next = { ...here, [memberId]: !here[memberId] };
    setHere(next);
    if (!meeting) return;

    startTransition(async () => {
      const result = await record(
        {
          meetingId: meeting.id,
          presentIds: members.filter((p) => next[p.memberId]).map((p) => p.memberId),
          notHeld: false,
          note: null,
        },
        church,
      );
      setError(result.error);
      setSaved(!result.error);
    });
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
      {error ? <Banner tone="danger" title={t("meeting.title")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="font-display text-[20px] text-fg">
            {t("group.attendanceOn", { date: shownDate })}
          </div>
          {/* R9.7. Which meeting is being recorded. A leader who missed last
              week opens the week they missed. */}
          {days.length > 1 ? (
            <div className="w-full sm:w-[240px]">
              <Picker
                name="metOn"
                defaultValue={day}
                options={days.map((one) => ({ value: one.on, label: one.label }))}
                label={t("meeting.day")}
                onChange={load}
                clearable={false}
              />
            </div>
          ) : (
            <div className="text-[12px] text-fg-subtle">{t("group.tapToMark")}</div>
          )}
        </div>
        <div className="font-display text-[28px] tabular-nums text-fg">
          {count}
          <span className="font-sans text-[14px] text-fg-subtle"> / {members.length}</span>
        </div>
      </div>

      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(min(200px,100%),1fr))]">
        {members.map((person) => {
          const on = Boolean(here[person.memberId]);
          return (
            <button
              key={person.memberId}
              type="button"
              aria-pressed={on}
              onClick={() => mark(person.memberId)}
              className="flex min-h-[52px] items-center gap-2.5 px-5 text-left hover:bg-canvas"
            >
              <span
                className={
                  "grid size-6 shrink-0 place-items-center rounded-full border " +
                  (on
                    ? "border-transparent bg-[var(--hue-fern-500)] text-white"
                    : "border-line-strong text-transparent")
                }
              >
                <Check className="size-3.5" aria-hidden />
              </span>
              <span className={on ? "flex-1 text-fg" : "flex-1 text-fg-subtle"}>{person.name}</span>
            </button>
          );
        })}
      </div>

      {/* Nothing to press. The line underneath says the register is written. */}
      <div className="flex items-center justify-end gap-2 border-t border-line bg-canvas px-5 py-2.5">
        <span className="text-[13px] text-fg-muted">
          {pending ? t("meeting.saving") : saved ? t("meeting.kept") : ""}
        </span>
      </div>
    </section>
  );
}
