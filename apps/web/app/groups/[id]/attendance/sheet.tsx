"use client";

import * as React from "react";
import { Check, CalendarOff } from "lucide-react";
import { Badge, Banner, Button, Card } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import type { Meeting, MeetingPerson } from "@hearth/db";
import { DateField } from "@/components/date-field";
import { open as openMeeting, record } from "./actions";

/**
 * R9.7. Attendance for a group, in under a minute, on a phone.
 *
 * Everybody starts present. A small group of twelve usually has ten or eleven
 * there, so the work is naming who was missing rather than naming who came:
 * four taps and a submit, which is what the requirement asks for. A leader
 * standing in a hallway with their coat on will do that. They will not do
 * twelve taps.
 *
 * Station density, because this is a phone held in one hand.
 */
export function AttendanceSheet({
  church,
  groupId,
  groupName,
  meeting: first,
  people: firstPeople,
  defaultDay,
  error: firstError,
}: {
  church: string;
  groupId: string;
  groupName: string;
  meeting: Meeting | null;
  people: MeetingPerson[];
  defaultDay: string;
  error?: string;
}) {
  const [day, setDay] = React.useState(defaultDay);
  const [meeting, setMeeting] = React.useState<Meeting | null>(first);
  const [people, setPeople] = React.useState<MeetingPerson[]>(firstPeople);
  const [here, setHere] = React.useState<Record<string, boolean>>({});
  const [notHeld, setNotHeld] = React.useState(first?.notHeld ?? false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(firstError);
  const [pending, startTransition] = React.useTransition();

  /**
   * Present unless somebody says otherwise, except where this meeting has been
   * recorded before: then it shows what was recorded, because a leader opening
   * last week to fix one name should not find everybody ticked again.
   */
  const fill = React.useCallback((rows: MeetingPerson[], recorded: boolean) => {
    const next: Record<string, boolean> = {};
    for (const person of rows) next[person.personId] = recorded ? person.present : true;
    setHere(next);
  }, []);

  React.useEffect(() => {
    fill(firstPeople, (first?.present ?? 0) > 0 || (first?.notHeld ?? false));
  }, [firstPeople, first, fill]);

  const load = (nextDay: string) => {
    setDay(nextDay);
    setSaved(false);
    startTransition(async () => {
      const result = await openMeeting(groupId, nextDay, church);
      setError(result.error);
      if (result.meeting && result.people) {
        setMeeting(result.meeting);
        setPeople(result.people);
        setNotHeld(result.meeting.notHeld);
        fill(result.people, result.meeting.present > 0 || result.meeting.notHeld);
      }
    });
  };

  const submit = () => {
    if (!meeting) return;
    startTransition(async () => {
      const result = await record(
        {
          meetingId: meeting.id,
          presentIds: people.filter((p) => here[p.personId]).map((p) => p.personId),
          notHeld,
          note: null,
        },
        church,
      );
      setError(result.error);
      if (result.meeting) {
        setMeeting(result.meeting);
        setSaved(true);
      }
    });
  };

  const count = people.filter((p) => here[p.personId]).length;

  return (
    <div data-density="station" className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={groupName}>{error}</Banner> : null}

      <DateField name="metOn" defaultValue={day} onValueChange={load} aria-label={t("meeting.day")} />

      {saved ? (
        <Card className="flex items-center gap-3 border-success">
          <Check className="size-6 text-success-text" aria-hidden />
          <span className="text-[length:var(--d-text-body)] text-fg">
            {notHeld ? t("meeting.savedNotHeld") : plural("meeting.saved", meeting?.present ?? 0)}
          </span>
        </Card>
      ) : null}

      {notHeld ? null : (
        <ul className="flex flex-col gap-2">
          {people.map((person) => (
            <li key={person.personId}>
              <button
                type="button"
                aria-pressed={Boolean(here[person.personId])}
                onClick={() => {
                  setSaved(false);
                  setHere((was) => ({ ...was, [person.personId]: !was[person.personId] }));
                }}
                className={
                  "flex w-full items-center justify-between gap-3 rounded-[var(--d-radius-control)] border px-4 py-3 text-left transition-colors " +
                  (here[person.personId]
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-fg"
                    : "border-line bg-surface text-fg-muted")
                }
              >
                <span className="flex items-center gap-2 text-[length:var(--d-text-body)]">
                  {person.name}
                  {person.role === "member" ? null : (
                    <Badge tone="neutral">{t(`groups.role.${person.role}` as never)}</Badge>
                  )}
                </span>
                {here[person.personId] ? (
                  <Check className="size-6 shrink-0 text-[var(--primary)]" aria-hidden />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <Button full disabled={pending || !meeting} onClick={submit}>
          <Check /> {notHeld ? t("meeting.saveNotHeld") : plural("meeting.save", count)}
        </Button>

        <Button
          full
          variant="ghost"
          onClick={() => {
            setSaved(false);
            setNotHeld((was) => !was);
          }}
        >
          <CalendarOff /> {notHeld ? t("meeting.wasHeld") : t("meeting.notHeld")}
        </Button>
      </div>
    </div>
  );
}
