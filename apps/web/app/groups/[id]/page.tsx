import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import {
  withTenant, groupPage, personForUser, getChurch, upcomingMeetings,
  listGroupTypes, groupRoster, canManageGroups,
} from "@hearth/db";
import { Badge, Card, Separator } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { JoinButton } from "./join-button";
import { ManageGroup } from "./manage";

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

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

/**
 * R9.5. A group's own page.
 *
 * The page somebody lands on from the finder, deciding whether to turn up on
 * Tuesday. It answers in this order: what is it, when and where, who runs it,
 * and may I come. Everything else is below the fold.
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
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };

  const manage = canManageGroups(session.role);

  const { group, today, types, roster } = await withTenant(actor, async (tx) => {
    const profile = await getChurch(tx, session.tenantId);
    const self = await personForUser(tx, session.userId);
    return {
      group: await groupPage(tx, id, { personId: self, manage }),
      today: churchNow(profile?.timezone ?? "America/Chicago").date,
      types: manage ? await listGroupTypes(tx) : [],
      roster: manage ? await groupRoster(tx, id) : [],
    };
  });

  if (!group) notFound();

  const next = upcomingMeetings(
    { dayOfWeek: group.dayOfWeek, frequency: group.frequency },
    today,
    3,
  );

  const schedule =
    group.dayOfWeek === null
      ? null
      : t("group.meets", {
          frequency: t(`groups.frequency.${group.frequency ?? "weekly"}` as never).toLowerCase(),
          day: dayName(group.dayOfWeek),
          span: group.startsAt
            ? group.endsAt
              ? `${readableTime(group.startsAt)} to ${readableTime(group.endsAt)}`
              : readableTime(group.startsAt)
            : "",
        });

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-caption text-fg-muted">
          <Link
            href={`/groups?church=${session.tenantSlug}`}
            className="rounded px-1 py-0.5 hover:text-fg"
          >
            {t("groups.title")}
          </Link>
          {group.typeName ? (
            <>
              <ChevronRight className="size-4" aria-hidden />
              <span>{group.typeName}</span>
            </>
          ) : null}
        </nav>

        <h1 className="font-display text-display text-fg">{group.name}</h1>

        <Card className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[length:var(--d-text-body)] text-fg">
            {group.mine
              ? t("find.member")
              : group.requested === "pending"
                ? t("find.asked")
                : group.requested === "declined"
                  ? t("find.declined")
                  : group.full
                    ? t("find.full")
                    : group.openToJoin
                      ? t("group.isOpen")
                      : t("find.closed")}
          </span>

          {!group.mine && group.openToJoin && !group.full && group.requested !== "pending" ? (
            <JoinButton church={session.tenantSlug} groupId={group.id} />
          ) : null}
        </Card>

        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {group.description ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-heading text-fg">{t("group.about", { name: group.name })}</h2>
                <p className="whitespace-pre-wrap text-[length:var(--d-text-body)] text-fg">
                  {group.description}
                </p>
              </section>
            ) : null}

            {next.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-heading text-fg">{t("group.upcoming")}</h2>
                <ul className="flex flex-col">
                  {next.map((date, i) => (
                    <li key={date}>
                      {i > 0 ? <Separator className="my-2" /> : null}
                      <span className="text-[length:var(--d-text-body)] text-fg">
                        {longDate(date)}
                        {group.startsAt ? (
                          <span className="ml-2 text-fg-muted">
                            {readableTime(group.startsAt)}
                            {group.endsAt ? ` to ${readableTime(group.endsAt)}` : ""}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {group.past.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-heading text-fg">{t("group.past")}</h2>
                <ul className="flex flex-col">
                  {group.past.map((meeting, i) => (
                    <li key={meeting.metOn}>
                      {i > 0 ? <Separator className="my-2" /> : null}
                      <span className="flex items-center justify-between gap-3 text-[length:var(--d-text-body)]">
                        <span className="text-fg">{longDate(meeting.metOn)}</span>
                        <span className="text-fg-muted">
                          {plural("group.came", meeting.present)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="flex flex-col gap-6 lg:w-72 lg:shrink-0">
            <section className="flex flex-col gap-2">
              <h2 className="text-label text-fg-muted">{t("group.categories")}</h2>
              <div className="flex flex-wrap gap-2">
                {group.dayOfWeek !== null ? (
                  <Badge tone="neutral">{dayName(group.dayOfWeek)}</Badge>
                ) : null}
                {group.typeName ? <Badge tone="neutral">{group.typeName}</Badge> : null}
                {group.forWhom && group.forWhom !== "anyone" ? (
                  <Badge tone="neutral">
                    {t(`groups.audience.${group.forWhom}` as never)}
                  </Badge>
                ) : null}
                {group.online ? <Badge tone="neutral">{t("groups.online")}</Badge> : null}
                {group.childrenWelcome ? (
                  <Badge tone="neutral">{t("groups.childrenWelcome")}</Badge>
                ) : null}
                {group.location ? <Badge tone="neutral">{group.location}</Badge> : null}
              </div>
            </section>

            {schedule ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-label text-fg-muted">{t("group.schedule")}</h2>
                <p className="text-[length:var(--d-text-body)] text-fg">{schedule}</p>
              </section>
            ) : null}

            {group.leaders.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-label text-fg-muted">{t("groups.leaders")}</h2>
                <p className="text-[length:var(--d-text-body)] text-fg">
                  {group.leaders.map((l) => l.name).join(", ")}
                </p>
              </section>
            ) : null}

            {group.address ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-label text-fg-muted">{t("group.where")}</h2>
                <p className="whitespace-pre-wrap text-[length:var(--d-text-body)] text-fg">
                  {group.address}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(group.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[length:var(--d-text-body)] text-fg-muted underline underline-offset-4 hover:text-fg"
                >
                  <MapPin className="size-4" aria-hidden />
                  {t("group.directions")}
                </a>
              </section>
            ) : null}
          </aside>
        </div>

        {manage ? (
          <ManageGroup
            church={session.tenantSlug}
            types={types.map((type) => ({ id: type.id, name: type.name, hue: type.hue }))}
            roster={roster.map((member) => ({
              personId: member.personId,
              name: member.name,
              role: member.role,
              joinedOn: member.joinedOn,
              leftOn: member.leftOn,
            }))}
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
      </main>
    </>
  );
}
