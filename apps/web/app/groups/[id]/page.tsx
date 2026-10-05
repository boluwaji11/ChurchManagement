import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import {
  withTenant, groupPage, personForUser, getChurch, upcomingMeetings,
  listGroupTypes, groupRoster, canManageGroups, pendingRequests,
  openMeeting, lastMeetingDay, canRecordFor,
  type Meeting, type MeetingPerson,
} from "@connectapp/db";
import { Badge } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { GroupBanner } from "../banner";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow, hasHappened } from "@/lib/church-now";
import { toAddress, oneLineAddress, directionsLink } from "@/lib/address";
import { JoinButton } from "./join-button";
import { ManageGroup } from "./manage";
import { GroupDetail, type DetailMeeting } from "./detail";

export const dynamic = "force-dynamic";

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
export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };

  const manage = canManageGroups(session);

  const data = await withTenant(actor, async (tx) => {
    const profile = await getChurch(tx, session.tenantId);
    const self = await personForUser(tx, session.userId);
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
    if (manage || (await canRecordFor(tx, actor, group.id))) {
      metOn = lastMeetingDay(group.dayOfWeek, today);
      const opened = await openMeeting(tx, actor, { groupId: group.id, metOn });
      meeting = opened.meeting;
      members = opened.members;
    }

    return {
      group,
      now,
      today,
      metOn,
      meeting,
      members,
      types: manage ? await listGroupTypes(tx) : [],
      roster: await groupRoster(tx, group.id),
      requests: manage
        ? (await pendingRequests(tx, actor)).filter((one) => one.groupId === group.id)
        : [],
    };
  });

  if (!data) notFound();
  const { group, now, today, metOn, meeting, members, types, roster, requests } = data;

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
    group.typeName ? { k: t("group.cat.type"), v: group.typeName } : null,
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

  return (
    <AppShell session={session}>
      {/* The way back on the left, and what this church may do to the group on
          the right, as the icons every other record page carries. */}
      <div className="flex items-center gap-3">
        <Link
          href={`/groups?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("groups.title")}
        </Link>

        <span className="flex-1" />

        {manage ? (
          <ManageGroup
            church={session.tenantSlug}
            types={types.map((type) => ({ id: type.id, name: type.name, hue: type.hue }))}
            group={{
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
            }}
          />
        ) : null}
      </div>

      {/* The kind, the name and when it meets on the left, the banner beside
          them, on one line until the screen is too narrow for two. */}
      <div className="grid items-center gap-7 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
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
          <div className="font-display text-[36px] leading-[42px] text-balance text-fg">
            {group.name}
          </div>
          <div className="text-fg-muted">
            {group.leaders.length > 0
              ? t("find.ledBy", { meets: meetsLine, leader: group.leaders.map((l) => l.name).join(", ") })
              : meetsLine}
          </div>
        </div>

        <GroupBanner
          church={session.tenantSlug}
          groupId={group.id}
          groupName={group.name}
          photoUrl={photoUrl}
          hue={hue}
          canEdit={manage}
        />
      </div>

      <GroupDetail
        church={session.tenantSlug}
        groupId={group.id}
        groupName={group.name}
        canManage={manage}
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
            <Badge tone="success">{t("find.member")}</Badge>
          ) : group.requested === "pending" ? (
            <Badge tone="neutral"><Check aria-hidden /> {t("find.asked")}</Badge>
          ) : group.requested === "declined" ? (
            <Badge tone="neutral">{t("find.declined")}</Badge>
          ) : group.full ? (
            <Badge tone="warning">{t("find.full")}</Badge>
          ) : group.openToJoin ? (
            <JoinButton church={session.tenantSlug} groupId={group.id} />
          ) : null
        }
        about={group.description}
        upcoming={upcomingMeetings(
          { dayOfWeek: group.dayOfWeek, frequency: group.frequency },
          today,
          3,
        ).map((iso) => tile(iso, false))}
        past={group.past.slice(0, 3).map((one) => tile(one.metOn, true))}
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
        members={roster
          .filter((one) => !one.leftOn)
          .map((one) => ({ memberId: one.memberId, name: one.name, role: one.role }))}
        meeting={meeting}
        attendees={members}
        attendanceDate={metOn ? shortDay(metOn) : ""}
        attendanceDays={attendanceDays}
      />

    </AppShell>
  );
}
