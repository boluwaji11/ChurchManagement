import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, groupPage, personForUser, getChurch, upcomingMeetings,
  listGroupTypes, groupRoster, canManageGroups, pendingRequests,
  openMeeting, lastMeetingDay, canRecordFor,
  type Meeting, type MeetingPerson,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { GroupBanner } from "../banner";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow } from "@/lib/church-now";
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

/**
 * R9.5. A group's own page.
 *
 * Built to docs/redesign/design: the kind and the name on the left with the
 * banner beside them, a line saying whether it is taking people, and three tabs
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
    const group = await groupPage(tx, id, { personId: self, manage });
    if (!group) return null;

    const today = churchNow(profile?.timezone ?? "America/Chicago").date;

    /*
     * R9.7. The register for the day it last met, opened here so the tab has
     * something to show the moment it is pressed. A leader who cannot record
     * for this group never sees the tab, so the meeting is never created for
     * them either.
     */
    let meeting: Meeting | null = null;
    let people: MeetingPerson[] = [];
    let metOn = "";
    if (manage || (await canRecordFor(tx, actor, id))) {
      metOn = lastMeetingDay(group.dayOfWeek, today);
      const opened = await openMeeting(tx, actor, { groupId: id, metOn });
      meeting = opened.meeting;
      people = opened.people;
    }

    return {
      group,
      today,
      metOn,
      meeting,
      people,
      types: manage ? await listGroupTypes(tx) : [],
      roster: await groupRoster(tx, id),
      requests: manage
        ? (await pendingRequests(tx, actor)).filter((one) => one.groupId === id)
        : [],
    };
  });

  if (!data) notFound();
  const { group, today, metOn, meeting, people, types, roster, requests } = data;

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
              name: group.name,
              description: group.description,
              typeId: group.typeId,
              dayOfWeek: group.dayOfWeek,
              startsAt: group.startsAt,
              endsAt: group.endsAt,
              frequency: group.frequency,
              location: group.location,
              address: group.address,
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
          {group.typeName ? (
            <span
              className="self-start rounded-full px-2 py-0.5 text-[12px] font-medium"
              style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
            >
              {group.typeName}
            </span>
          ) : null}
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
        canManage={manage}
        openToJoin={group.openToJoin}
        hue={hue}
        join={
          !group.mine && group.openToJoin && !group.full && group.requested !== "pending" ? (
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
        location={[group.location, group.address].filter(Boolean).join("\n")}
        requests={requests.map((one) => ({ id: one.id, personName: one.personName }))}
        members={roster
          .filter((one) => !one.leftOn)
          .map((one) => ({ personId: one.personId, name: one.name, role: one.role }))}
        meeting={meeting}
        people={people}
        attendanceDate={
          metOn
            ? asDate(metOn).toLocaleDateString("en-US", {
                weekday: "short", day: "numeric", month: "short",
              })
            : ""
        }
      />

    </AppShell>
  );
}
