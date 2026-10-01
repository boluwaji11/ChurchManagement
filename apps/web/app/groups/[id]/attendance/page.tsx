import { notFound } from "next/navigation";
import {
  withTenant, getGroup, openMeeting, meetingsFor, canRecordFor, lastMeetingDay, getChurch,
} from "@hearth/db";
import { Banner, Card, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { AttendanceSheet } from "./sheet";

export const dynamic = "force-dynamic";

const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short",
  });

/**
 * R9.7. The screen a group leader opens on a Tuesday night.
 *
 * Its own page rather than a panel inside the group, because this is the one
 * thing a leader does and it is done on a phone with one hand.
 */
export default async function GroupAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };

  const data = await withTenant(actor, async (tx) => {
    const group = await getGroup(tx, id);
    if (!group) return null;

    const allowed = await canRecordFor(tx, actor, id);
    if (!allowed) return { group, allowed, meeting: null, people: [], history: [], today: "" };

    const profile = await getChurch(tx, session.tenantId);
    const today = churchNow(profile?.timezone ?? "America/Chicago").date;
    const metOn = lastMeetingDay(group.dayOfWeek, today);
    const opened = await openMeeting(tx, actor, { groupId: id, metOn });

    return {
      group,
      allowed,
      meeting: opened.meeting,
      people: opened.people,
      history: await meetingsFor(tx, id, { limit: 8 }),
      today: metOn,
    };
  });

  if (!data) notFound();

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-lg px-4 py-6 sm:px-6">
        <PageTitle title={data.group.name} className="mb-5" />

        {data.allowed ? (
          <div className="flex flex-col gap-6">
            <AttendanceSheet
              church={session.tenantSlug}
              groupId={id}
              groupName={data.group.name}
              meeting={data.meeting}
              people={data.people}
              defaultDay={data.today}
            />

            {data.history.length > 0 ? (
              <Card className="flex flex-col gap-2">
                <span className="text-label text-fg-muted">{t("meeting.history")}</span>
                {data.history.map((meeting, i) => (
                  <div key={meeting.id}>
                    {i > 0 ? <Separator className="my-2" /> : null}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[length:var(--d-text-body)] text-fg">
                        {day(meeting.metOn)}
                      </span>
                      <span className="text-[length:var(--d-text-body)] text-fg-muted">
                        {meeting.notHeld
                          ? t("meeting.notHeld")
                          : t("meeting.of", { present: meeting.present, roster: meeting.roster })}
                      </span>
                    </div>
                  </div>
                ))}
              </Card>
            ) : null}
          </div>
        ) : (
          <Banner tone="info" title={data.group.name}>{t("forbidden.askAdmin")}</Banner>
        )}
      </main>
    </>
  );
}
