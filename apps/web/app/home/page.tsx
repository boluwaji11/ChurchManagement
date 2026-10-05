import Link from "next/link";
import { redirect } from "next/navigation";
import {
  withTenant, findGroups, personForUser, householdFor, assignmentsForPerson,
  listEvents, listOccurrences, myChildren, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import {
  PortalShell, PortalTitle, PortalSection, Panel,
} from "@/components/portal-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Respond } from "./serving/respond";
import { CheckinCard } from "./checkin-card";
import { onDay, dayName, readableTime } from "./when";

export const dynamic = "force-dynamic";

/**
 * R17.1. The whole of the product for somebody who is not staff.
 *
 * What is being asked of them first, then what is theirs. A member signs in
 * two or three times a year, usually because the church asked them something,
 * so the thing waiting on an answer leads the screen. The week down the main
 * column, the standing facts down the side, which is the shape the redesign
 * draws.
 *
 * Giving is not here. Money is deferred, and R17.4 comes back with it.
 */
export default async function MemberHomePage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // Staff have their own screens, and this is not one of them.
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/dashboard?church=${session.tenantSlug}`);
  }

  const mine = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      const now = churchNow("America/Chicago");

      /*
       * R17.8. The next service today, which is the only one a parent is
       * checking in to. Nothing to check in to is the common case and the card
       * stays off the screen.
       */
      const today = await listOccurrences(tx, { from: now.date, to: now.date });
      const next = today.find((one) => one.status !== "cancelled") ?? null;
      const actor = {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
      };

      return {
        service: next,
        children: next ? await myChildren(tx, actor, next.id) : [],
        today: now.date,
        groups: (await findGroups(tx, { memberId: self })).filter((group) => group.mine),
        household: self ? await householdFor(tx, self) : null,
        serving: self
          ? await assignmentsForPerson(tx, self, { from: now.date, limit: 6 })
          : [],
        // R14.2. Publishing is the gate, not listing. A draft's public page
        // answers 404 on purpose, so a card for one goes nowhere.
        events: (await listEvents(tx, { from: now.date }))
          .filter((one) => one.listed && one.status === "published")
          .slice(0, 3),
      };
    },
  );

  const asked = mine.serving.filter((one) => one.status === "pending");
  const ahead = mine.serving.filter((one) => one.status !== "pending").slice(0, 3);
  const first = session.displayName.split(" ")[0] ?? session.displayName;

  return (
    <PortalShell session={session}>
      <PortalTitle title={t("home.hello", { name: first })} />

      {/* The week down the main column, the standing facts down the side, with
          a rule between them. The aside is pushed down by the height of the
          heading beside it (28px of line plus the 16px gap under it) so the
          first card on each side starts on the same line. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <PortalSection title={t("home.thisWeek")}>
            {/* R17.8. The children, before the rota: a parent leaving the house
                has one of these on their mind and it is not the welcome desk. */}
            {mine.service && mine.children.length > 0 ? (
              <CheckinCard
                church={session.tenantSlug}
                occurrenceId={mine.service.id}
                serviceName={mine.service.name}
              >
                {mine.children}
              </CheckinCard>
            ) : null}

            {asked.length === 0 && ahead.length === 0 ? (
              <Panel>
                <p className="text-[length:var(--d-text-body)] text-fg-muted">
                  {t("home.noSchedule")}
                </p>
              </Panel>
            ) : null}

            {/* What the church is waiting on. It leads, because it is the
                reason most members open this at all. */}
            {asked.map((one) => (
              <Panel key={one.id} className="flex flex-wrap items-center gap-4">
                <span className="flex min-w-[260px] flex-1 flex-col gap-1">
                  <span className="self-start rounded-full bg-hue-sky-100 px-2 py-0.5 text-caption font-medium text-hue-sky-700">
                    {one.teamName}
                  </span>
                  <span className="mt-1.5 text-[17px] font-semibold leading-6 text-fg">
                    {t("home.servingAsked")}
                  </span>
                  <span className="text-[length:var(--d-text-body)] text-fg-muted">
                    {onDay(one.occursOn)} {readableTime(one.startsAt)} {one.positionName}
                  </span>
                </span>
                <Respond id={one.id} church={session.tenantSlug} />
              </Panel>
            ))}

            {ahead.length > 0 ? (
              <Panel className="flex flex-col divide-y divide-line px-5 py-0">
                {ahead.map((one) => (
                  <span key={one.id} className="flex flex-wrap items-center gap-3.5 py-3">
                    <span className="flex w-13 shrink-0 flex-col items-center leading-[18px]">
                      <span className="text-caption font-medium text-fg-subtle">
                        {onDay(one.occursOn).split(",")[0]}
                      </span>
                      <span className="font-display text-[22px] leading-[26px] text-fg">
                        {new Date(`${one.occursOn}T00:00:00`).getDate()}
                      </span>
                    </span>
                    <span className="flex min-w-[180px] flex-1 flex-col leading-5">
                      <span className="font-medium text-fg">{one.positionName}</span>
                      <span className="text-caption text-fg-muted">
                        {one.teamName} {readableTime(one.startsAt)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-hue-fern-100 px-2.5 py-0.5 text-caption font-medium text-hue-fern-700">
                      {t("home.accepted")}
                    </span>
                  </span>
                ))}
              </Panel>
            ) : null}

            <Link
              href={`/home/serving?church=${session.tenantSlug}`}
              className="self-start text-[length:var(--d-text-body)] font-medium text-primary"
            >
              {t("home.seeAll")}
            </Link>

            {/* What the church has on, each row opening its own page. */}
            {mine.events.length > 0 ? (
              <Panel className="flex flex-col divide-y divide-line px-5 py-0">
                {mine.events.map((one) => {
                  const when = new Date(`${one.startsOn}T00:00:00`);
                  return (
                    <Link
                      key={one.id}
                      href={`/events/${one.slug}?church=${session.tenantSlug}`}
                      className="flex flex-wrap items-center gap-3.5 py-3"
                    >
                      <span className="flex w-13 shrink-0 flex-col items-center leading-[18px]">
                        <span className="text-caption font-medium text-fg-subtle">
                          {when.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="font-display text-[22px] leading-[26px] text-fg">
                          {when.getDate()}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: `var(--hue-${one.hue}-500)` }}
                      />
                      <span className="flex min-w-[180px] flex-1 flex-col leading-5">
                        <span className="font-medium text-fg">{one.name}</span>
                        <span className="text-caption text-fg-muted">
                          {one.startsAt ? readableTime(one.startsAt) : ""}
                          {one.location ? ` ${one.location}` : ""}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </Panel>
            ) : null}
          </PortalSection>
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[320px] lg:shrink-0 lg:border-l lg:border-line lg:pl-8 lg:pt-11">
          <Panel className="flex flex-col gap-2.5">
            <span className="text-caption font-medium text-fg-subtle">{t("home.myGroups")}</span>
            {mine.groups.length > 0 ? (
              mine.groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.slug}?church=${session.tenantSlug}`}
                  className="flex items-center gap-2.5"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: `var(--hue-${group.typeHue ?? "indigo"}-500)` }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">{group.name}</span>
                  <span className="shrink-0 text-caption text-fg-subtle">
                    {group.dayOfWeek !== null ? `${dayName(group.dayOfWeek)}s` : ""}
                  </span>
                </Link>
              ))
            ) : null}
            <Link
              href={`/groups?church=${session.tenantSlug}`}
              className="self-start text-[length:var(--d-text-body)] font-medium text-primary"
            >
              {mine.groups.length > 0 ? t("home.findAnother") : t("find.title")}
            </Link>
          </Panel>

          {mine.household ? (
            <Panel className="flex flex-col gap-2.5">
              <span className="text-caption font-medium text-fg-subtle">
                {t("home.myHousehold")}
              </span>
              {mine.household.members.map((one) => (
                <span key={one.id} className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-fg">{one.displayName}</span>
                  <span className="shrink-0 text-caption text-fg-subtle">
                    {t(`householdRole.${one.role}` as never)}
                  </span>
                </span>
              ))}
              <Link
                href={`/home/household?church=${session.tenantSlug}`}
                className="self-start text-[length:var(--d-text-body)] font-medium text-primary"
              >
                {t("home.seeAll")}
              </Link>
            </Panel>
          ) : null}
        </aside>
      </div>
    </PortalShell>
  );
}
