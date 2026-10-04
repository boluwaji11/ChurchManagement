"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, UserMinus } from "lucide-react";
import {
  Avatar, Banner, Button, IconButton, Dialog, DialogContent, DialogFooter,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { Meeting, MeetingPerson } from "@hearth/db";
import { decide, setOpenToJoin, leave } from "../actions";
import { AddMember } from "../add-member";
import { record } from "./meeting-actions";

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
  personId: string;
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
 * Built to docs/redesign/design: the line saying whether it is taking people,
 * three tabs, and under Overview the description, what is coming, what has
 * happened, and a column of facts down the right.
 */
export function GroupDetail({
  church,
  groupId,
  canManage,
  openToJoin,
  join,
  about,
  upcoming,
  past,
  categories,
  schedule,
  leaders,
  location,
  requests,
  members,
  meeting,
  people,
  attendanceDate,
}: {
  church: string;
  groupId: string;
  canManage: boolean;
  openToJoin: boolean;
  /** R9.5. Asking to come, where this reader may. */
  join?: React.ReactNode;
  about: string | null;
  upcoming: DetailMeeting[];
  past: DetailMeeting[];
  categories: { k: string; v: string }[];
  schedule: string | null;
  leaders: string[];
  location: string | null;
  requests: DetailRequest[];
  members: DetailMember[];
  meeting: Meeting | null;
  people: MeetingPerson[];
  attendanceDate: string;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState("overview");
  const [error, setError] = React.useState<string>();
  const [removing, setRemoving] = React.useState<DetailMember | null>(null);
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      {/* Whether it is taking people, and the one press that changes it. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sunken px-[18px] py-3.5">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: openToJoin ? "var(--hue-fern-500)" : "var(--fg-subtle)" }}
        />
        <span className="min-w-[140px] flex-1 font-medium text-fg">
          {openToJoin ? t("group.openText") : t("group.closedText")}
        </span>
        {join}

        {canManage ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => setOpenToJoin(groupId, !openToJoin, church))}
            className="h-[34px] min-h-0 px-3 text-[13px]"
          >
            {openToJoin ? t("group.close") : t("group.open")}
          </Button>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("group.tab.overview")}</TabsTrigger>
          <TabsTrigger value="members" className="inline-flex items-center gap-1.5">
            {t("group.tab.members")}
            <span className="text-[12px] text-fg-muted">{members.length}</span>
          </TabsTrigger>
          {canManage ? (
            <TabsTrigger value="attendance">{t("group.tab.attendance")}</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="overview">
          <div className="flex flex-wrap items-start gap-10">
            <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-7">
              {about ? (
                <section className="flex flex-col gap-2.5">
                  <h2 className="font-display text-[24px] font-normal text-fg">
                    {t("group.about", { name: "" }).trim()}
                  </h2>
                  <p className="max-w-[68ch] text-[15px] leading-6 whitespace-pre-line text-fg">
                    {about}
                  </p>
                </section>
              ) : null}

              <MeetingList title={t("group.upcoming")} rows={upcoming} onTake={() => setTab("attendance")} />
              <MeetingList title={t("group.past")} rows={past} onTake={() => setTab("attendance")} />
            </div>

            <aside className="flex flex-[1_1_260px] flex-col gap-6">
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
                </Facts>
              ) : null}

              {canManage ? (
                <div className="flex flex-col gap-2 border-t border-line pt-5">
                  <span className="text-[12px] font-semibold tracking-[0.06em] text-fg-subtle uppercase">
                    {t("group.requests")}
                  </span>
                  {requests.length === 0 ? (
                    <span className="text-[13px] text-fg-muted">{t("group.noRequests")}</span>
                  ) : (
                    requests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between gap-3">
                        <span className="font-medium text-fg">{request.personName}</span>
                        <Button
                          variant="secondary"
                          disabled={pending}
                          onClick={() => run(() => decide(request.id, true, church))}
                          className="h-7 min-h-0 px-2.5 text-[12px]"
                        >
                          {t("find.approve")}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className="flex flex-col gap-4">
            <section className="overflow-hidden rounded-lg border border-line bg-surface">
              {members.map((member) => (
                <div
                  key={member.personId}
                  className="flex min-h-[56px] items-center gap-3 border-b border-sunken px-5 last:border-b-0"
                >
                  <Avatar
                    name={member.name}
                    id={member.personId}
                    className="size-[34px] text-[12px] font-semibold"
                  />
                  <span className="flex-1 font-medium text-fg">{member.name}</span>
                  <span className="text-[12px] text-fg-muted">
                    {t(`groups.role.${member.role}` as never)}
                  </span>
                  {canManage ? (
                    <IconButton
                      label={t("groups.remove")}
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setRemoving(member)}
                    >
                      <UserMinus />
                    </IconButton>
                  ) : null}
                </div>
              ))}
            </section>

            {canManage ? <AddMember church={church} groupId={groupId} /> : null}
          </div>
        </TabsContent>

        {canManage ? (
          <TabsContent value="attendance">
            <Register
              church={church}
              meeting={meeting}
              people={people}
              date={attendanceDate}
            />
          </TabsContent>
        ) : null}
      </Tabs>

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
                if (who) run(() => leave(groupId, who.personId, church));
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
      <span className="text-[12px] font-semibold tracking-[0.06em] text-fg-subtle uppercase">
        {label}
      </span>
      <span className="text-[length:var(--d-text-body)] text-fg">{children}</span>
    </div>
  );
}

/** A date tile, the name, and the register where the meeting has happened. */
function MeetingList({
  title,
  rows,
  onTake,
}: {
  title: string;
  rows: DetailMeeting[];
  onTake: () => void;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-1">
      <h2 className="mb-1.5 font-display text-[22px] font-normal text-fg">{title}</h2>
      {rows.map((row) => (
        <div key={row.on} className="flex items-center gap-4 py-2.5">
          <div className="flex h-16 w-[72px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-sunken">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-fg-subtle uppercase">
              {row.mon}
            </span>
            <span className="font-display text-[24px] leading-[26px] text-fg">{row.day}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold text-fg">{row.when}</span>
          </div>
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
      ))}
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
  meeting,
  people,
  date,
}: {
  church: string;
  meeting: Meeting | null;
  people: MeetingPerson[];
  date: string;
}) {
  const recorded = (meeting?.present ?? 0) > 0 || (meeting?.notHeld ?? false);
  const [here, setHere] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(people.map((p) => [p.personId, recorded ? p.present : true])),
  );
  const [error, setError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const count = people.filter((p) => here[p.personId]).length;

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
      {error ? <Banner tone="danger" title={t("meeting.title")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <div className="font-display text-[20px] text-fg">
            {t("group.attendanceOn", { date })}
          </div>
          <div className="text-[12px] text-fg-subtle">{t("group.tapToMark")}</div>
        </div>
        <div className="font-display text-[28px] tabular-nums text-fg">
          {count}
          <span className="font-sans text-[14px] text-fg-subtle"> / {people.length}</span>
        </div>
      </div>

      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        {people.map((person) => {
          const on = Boolean(here[person.personId]);
          return (
            <button
              key={person.personId}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setSaved(false);
                setHere((was) => ({ ...was, [person.personId]: !was[person.personId] }));
              }}
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

      <div className="flex items-center justify-end gap-2 border-t border-line bg-canvas px-4 py-3">
        {saved ? (
          <span className="mr-auto text-[13px] text-fg-muted">
            {t("meeting.of", { present: count, roster: people.length })}
          </span>
        ) : null}
        <Button
          disabled={pending || !meeting}
          onClick={() => {
            if (!meeting) return;
            startTransition(async () => {
              const result = await record(
                {
                  meetingId: meeting.id,
                  presentIds: people.filter((p) => here[p.personId]).map((p) => p.personId),
                  notHeld: false,
                  note: null,
                },
                church,
              );
              setError(result.error);
              if (!result.error) setSaved(true);
            });
          }}
        >
          {t("group.saveAttendance")}
        </Button>
      </div>
    </section>
  );
}
