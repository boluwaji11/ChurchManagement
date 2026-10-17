import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import {
  withTenant, groupPage, personForUser, getChurch, upcomingMeetings,
  listGroupTypes, groupRoster, canManageGroups, pendingRequests,
  openMeeting, lastMeetingDay, canRecordFor, canAnswerMessages,
  type Meeting, type MeetingPerson,
} from "@connectapp/db";
import { Badge } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { RecordPanel, type RecordPanelSection } from "@/components/record-panel";
import { returnToList } from "@/lib/return-to";
import { requireSession } from "@/lib/session";
import { GroupBanner } from "../banner";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow, hasHappened } from "@/lib/church-now";
import { toAddress, oneLineAddress, directionsLink } from "@/lib/address";
import { JoinButton } from "./join-button";
import { AskedButton } from "./asked-button";
import { LeaveButton } from "./leave-button";
import { ManageGroup } from "./manage";
import { GroupDetail, type DetailMeeting } from "./detail";
import { WriteTo } from "@/components/inbox/write-to";
import { AddMemberMark, AddMemberStep } from "../add-member";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("nav.groups"));
}

const dayName = (day: number) =>
  new Date(2024, 0, 7 + day).toLocaleDateString("en-US", { weekday: "long" });

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
};

const asDate = (iso: string) => new Date(`${iso}T00:00:00`);

const shortDay = (iso: string) =>
  asDate(iso).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

/**
 * R9.5. A group's own page.
 *
 * Built to docs/redesign/design: the kind and the name on the left with the
 * banner beside them, a line saying whether it is taking members, and three tabs
 * underneath. It answers in the order somebody asks: what is it, when and
 * where, who runs it, and may I come.
 */
export async function GroupPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; returnTo?: string }>;
}) {
  const { id } = await params;
  const { type, returnTo } = await searchParams;
  const session = await requireSession();
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };

  const manage = canManageGroups(session);

  const data = await withTenant(actor, async (tx) => {
    /* Eight reads waited on each other here. These three want nothing from
       each other, and the rest of the screen wants all three. */
    const [profile, self, types] = await Promise.all([
      getChurch(tx, session.tenantId),
      personForUser(tx, session.userId),
      manage ? listGroupTypes(tx) : [],
    ]);

    const group = await groupPage(tx, id, { memberId: self, manage });
    if (!group) return null;

    const now = churchNow(profile?.timezone ?? "America/Chicago");
    const today = now.date;

    /*
     * R9.7. The register for the day it last met, opened here so the tab has
     * something to show the moment it is pressed. A leader who cannot record
     * for this group never sees the tab, so the meeting is never created for
     * them either.
     */
    let meeting: Meeting | null = null;
    let members: MeetingPerson[] = [];
    let metOn = "";
    // R9.7. Recording who came is the leader's job, so this is the group's own
    // leader or whoever runs groups. A member reads the dates and nothing else.
    const canRecord = manage || (await canRecordFor(tx, actor, group.id));

    /*
     * R9.7. A group that has not said when it meets has not met.
     *
     * Without this, a group with no day and no pattern had a meeting opened on
     * whatever day somebody first looked at it, and the page then showed that
     * day under Past event with a register waiting. The date a register opens
     * for comes from the pattern, so there has to be one.
     */
    const meets = group.dayOfWeek !== null || group.frequency === "daily";
    if (canRecord && meets) metOn = lastMeetingDay(group.dayOfWeek, today);

    /* The register, the roster and the waiting requests all needed to know
       whether this reader records for the group, and nothing else. */
    const [opened, roster, requests] = await Promise.all([
      canRecord && meets
        ? openMeeting(tx, actor, { groupId: group.id, metOn })
        : null,
      /*
       * R3.1, R9.5. Who is in a group is the church's record, not the finder's.
       * A member reads what the group is and asks to join it; the roster goes
       * to the people who run it. Withheld here rather than hidden on screen,
       * so it is never in the page at all.
       */
      canRecord ? groupRoster(tx, group.id) : [],
      manage ? pendingRequests(tx, actor) : [],
    ]);

    if (opened) {
      meeting = opened.meeting;
      members = opened.members;
    }

    return {
      group,
      meets,
      now,
      today,
      metOn,
      meeting,
      members,
      canRecord,
      types,
      roster,
      requests: requests.filter((one) => one.groupId === group.id),
    };
  });

  if (!data) notFound();
  const { group, meets, now, today, metOn, meeting, members, roster, requests, canRecord } = data;

  // R9.2. The bucket is private, so the picture is served through a link signed
  // for an hour. A leaked path is then a leak with an expiry.
  let photoUrl: string | null = null;
  if (group.photoKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(group.photoKey, 3600);
    photoUrl = signed.data?.signedUrl ?? null;
  }

  const span = group.startsAt
    ? group.endsAt
      ? `${readableTime(group.startsAt)} to ${readableTime(group.endsAt)}`
      : readableTime(group.startsAt)
    : "";

  const meetsLine =
    group.dayOfWeek === null
      ? (group.location ?? "")
      : `${dayName(group.dayOfWeek)}s${span ? `, ${span}` : ""}`;

  const schedule =
    group.dayOfWeek === null
      ? null
      : t("group.meets", {
          frequency: t(`groups.frequency.${group.frequency ?? "weekly"}` as never).toLowerCase(),
          day: dayName(group.dayOfWeek),
          span,
        });

  /** A date tile and a line, which is all a meeting shows here. */
  const tile = (iso: string, canTake: boolean): DetailMeeting => {
    const d = asDate(iso);
    return {
      on: iso,
      mon: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: String(d.getDate()),
      when:
        d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) +
        (group.startsAt ? ` · ${readableTime(group.startsAt)}` : ""),
      canTake,
    };
  };

  const categories = [
    group.dayOfWeek !== null ? { k: t("group.cat.day"), v: dayName(group.dayOfWeek) } : null,
    group.forWhom && group.forWhom !== "anyone"
      ? { k: t("group.cat.forWhom"), v: t(`groups.audience.${group.forWhom}` as never) }
      : null,
    group.location ? { k: t("group.cat.meetsAt"), v: group.location } : null,
    /* The kind is the pill at the top of the record, so it is not written
       again as a fact beside it. */
  ].filter(Boolean) as { k: string; v: string }[];

  const hue = group.typeHue ?? "sky";

  /*
   * R9.7. The meetings a register can be opened for.
   *
   * Only the ones that have actually happened, in the church's own time: a
   * group meeting at two o'clock appears on its date at two o'clock, not at
   * midnight and not next week. A leader who missed last week records last week
   * from here rather than hunting for a date field.
   */
  const attendanceDays = metOn
    ? [...new Set([metOn, ...group.past.map((one) => one.metOn)])]
        .filter((on) => hasHappened(now, on, group.startsAt ?? "00:00"))
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 10)
        .map((on) => ({ on, label: shortDay(on) }))
    : [];

  /*
   * R9.5. Back to the list this group was opened from: a kind, everything, or
   * the kinds themselves. Returning somebody to the first of two screens they
   * walked through is the failure this avoids.
   */
  const closeTo = returnToList(
    returnTo ?? (type ? `/groups?type=${encodeURIComponent(type)}` : "/groups"),
    "/groups",
  );

  /** R9.2. The group as the two marks that change it read it. */
  const manageGroup = {
    id: group.id,
    slug: group.slug,
    name: group.name,
    description: group.description,
    typeId: group.typeId,
    dayOfWeek: group.dayOfWeek,
    startsAt: group.startsAt,
    endsAt: group.endsAt,
    frequency: group.frequency,
    endsOn: group.endsOn,
    location: group.location,
    addressLine1: group.addressLine1,
    addressLine2: group.addressLine2,
    city: group.city,
    region: group.region,
    postalCode: group.postalCode,
    country: group.country,
    capacity: group.capacity,
    forWhom: group.forWhom,
    online: group.online,
    childrenWelcome: group.childrenWelcome,
    openToJoin: group.openToJoin,
    listed: group.listed,
  };

  /* R24.6. What this church may do to the group, on the window's own row of
     marks. The way back is the close square. */
  const actions = (
      <div className="flex items-center gap-1">
        {/* R9.7, R16.9. The group's own thread, for whoever may write into it:
            the office speaks for the church, and a member writes to the groups
            they are in. */}
        {canAnswerMessages(session) || group.mine ? (
          <WriteTo at={`group/${group.slug}`} name={group.name} />
        ) : null}

        {manage ? <ManageGroup only="edit" group={manageGroup} /> : null}
      </div>
  );

  /* R9.5, R24.6. The rail names the parts a reader may open. Attendance and
     the roster belong to whoever records for this group, so a member meets the
     group with no rail at all. */
  const sections: RecordPanelSection[] = canRecord
    ? [
        { id: "overview", label: t("group.tab.overview") },
        { id: "members", label: t("group.tab.members") },
        { id: "attendance", label: t("group.tab.attendance") },
      ]
    : [];

  return (
    <RecordPanel
      title={group.name}
      sections={sections.length > 1 ? sections : undefined}
      /* R24.6. A step the rail does not name, which the mark above opens and
         which hands the reader back to the part they left. */
      aside={manage ? ["add"] : undefined}
      actions={actions}
      /* R24.6. Archiving sits at the far left of the window's footer, away
         from the marks that are pressed every day. */
      footer={manage ? (
        <div className="flex w-full items-center">
          <ManageGroup only="archive" group={manageGroup} />
        </div>
      ) : undefined}
      closeTo={closeTo}
      width="980px"
    >
      {manage ? <AddMemberStep groupId={group.id} /> : null}

      <div className="flex flex-col gap-7">
      {/* R24.6. The kind and when it meets, over the picture. The name is the
          window's own title, so it is not written twice.

          Marked as part of the overview, because it sits outside that section
          and was being read over the roster and over the step that adds
          members to it. */}
      <div data-record-part="overview" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <span className="flex flex-wrap items-center gap-2">
            {group.status === "draft" ? (
              <span
                className="rounded-full px-2 py-0.5 text-[12px] font-medium"
                style={{
                  background: "var(--hue-amber-tint)",
                  color: "var(--hue-amber-key)",
                }}
              >
                {t("event.status.draft")}
              </span>
            ) : null}
            {group.typeName ? (
              <span
                className="rounded-full px-2 py-0.5 text-[12px] font-medium"
                style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
              >
                {group.typeName}
              </span>
            ) : null}
          </span>
          {/* The lead and when it meets, and whichever of the two there is
             where there is only one: a church with no day set on a group read
             a line that opened on the separator. */}
          {/* When it meets. Who runs it is a fact of its own further down, so
             saying it here as well put the same name on the screen twice. */}
          {meetsLine ? <div className="text-fg-muted">{meetsLine}</div> : null}
        </div>

        {/* R9.2. Read here, changed on the edit screen. A group with no picture
            keeps the block in its kind's colour, which is what the design puts
            beside the name. An upload box on the page a member reads is an
            invitation to edit a group while standing in it. */}
        <GroupBanner
          groupId={group.id}
          groupName={group.name}
          photoUrl={photoUrl}
          hue={hue}
          canEdit={false}
        />
      </div>

      <GroupDetail
        church={session.tenantSlug}
        groupId={group.id}
        groupName={group.name}
        canManage={manage}
        canRecord={canRecord}
        openToJoin={group.openToJoin}
        status={group.status}
        hue={hue}
        /*
         * R9.5. Where this reader stands with the group.
         *
         * Asking replaces the button with the answer rather than taking it
         * away: a control that disappears when pressed reads as a bug, and the
         * one thing somebody wants to know afterwards is whether it went.
         */
        join={
          group.mine ? (
            <span className="flex flex-wrap items-center gap-3">
              <Badge tone="success"><Check aria-hidden /> {t("find.member")}</Badge>
              <LeaveButton
                groupId={group.id}
                groupName={group.name}
              />
            </span>
          ) : group.requested === "pending" ? (
            <AskedButton groupId={group.id} />
          ) : group.requested === "declined" ? (
            <Badge tone="neutral">{t("find.declined")}</Badge>
          ) : group.full ? (
            <Badge tone="warning">{t("find.full")}</Badge>
          ) : group.openToJoin ? (
            <JoinButton groupId={group.id} />
          ) : null
        }
        about={group.description}
        upcoming={upcomingMeetings(
          { dayOfWeek: group.dayOfWeek, frequency: group.frequency },
          today,
          3,
        ).map((iso) => tile(iso, false))}
        /* R9.7. A group with no pattern has no meetings to show, including any
           a page view opened for it before that was true. */
        past={(meets ? group.past : []).slice(0, 3).map((one) => tile(one.metOn, canRecord))}
        categories={categories}
        schedule={schedule}
        leaders={group.leaders.map((one) => one.name)}
        location={[
          group.location,
          oneLineAddress(
            toAddress({
              line1: group.addressLine1,
              line2: group.addressLine2,
              city: group.city,
              region: group.region,
              postalCode: group.postalCode,
              country: group.country,
            }),
          ),
        ]
          .filter(Boolean)
          .join("\n")}
        directions={directionsLink(
          toAddress({
            line1: group.addressLine1,
            line2: group.addressLine2,
            city: group.city,
            region: group.region,
            postalCode: group.postalCode,
            country: group.country,
          }),
        )}
        requests={requests.map((one) => ({ id: one.id, personName: one.personName }))}
        onAdd={manage ? <AddMemberMark /> : undefined}
        members={roster
          .filter((one) => !one.leftOn)
          .map((one) => ({ memberId: one.memberId, name: one.name, role: one.role }))}
        meeting={meeting}
        attendees={members}
        attendanceDate={metOn ? shortDay(metOn) : ""}
        attendanceDays={attendanceDays}
      />
      </div>
    </RecordPanel>
  );
}
