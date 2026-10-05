import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, HandHeart } from "lucide-react";
import {
  withTenant, findGroups, personForUser, householdFor, assignmentsForPerson,
  upcomingServices, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { Button, Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { BrandRule } from "@/components/brand-rule";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Respond } from "./serving/respond";
import { onDay, atTime, dayName, readableTime } from "./when";

export const dynamic = "force-dynamic";

/**
 * R17.1. The whole of the product for somebody who is not staff.
 *
 * What is being asked of them first, then what is theirs. A member signs in
 * two or three times a year, usually because the church asked them something,
 * so the thing waiting on an answer leads the screen and everything else sits
 * under it.
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

  const scope = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const mine = await withTenant(scope, async (tx) => {
    const self = await personForUser(tx, session.userId);
    const now = churchNow("America/Chicago");

    return {
      today: now.date,
      groups: (await findGroups(tx, { memberId: self })).filter((group) => group.mine),
      household: self ? await householdFor(tx, self) : null,
      serving: self
        ? await assignmentsForPerson(tx, self, { from: now.date, limit: 5 })
        : [],
      services: await upcomingServices(tx, { from: now.date, limit: 1 }),
    };
  });

  const next = mine.services[0];
  const asked = mine.serving.filter((one) => one.status === "pending");
  const first = session.displayName.split(" ")[0] ?? session.displayName;

  return (
    <AppShell
      session={session}
      title={t("home.hello", { name: first })}
      density="portal"
      max="max-w-3xl"
    >
      <div className="flex flex-col gap-7">
        {/* R1.1. The church's colour, on the screen its members are handed. */}
        <BrandRule tenantId={session.tenantId} role={session.role} />

        {next ? (
          <p className="-mt-3 text-[length:var(--d-text-body)] text-fg-muted">
            {t("home.nextService", {
              name: next.name,
              when: `${onDay(next.occursOn)}, ${readableTime(next.startsAt)}`,
            })}
          </p>
        ) : null}

        {/* What the church is waiting on. It leads, because it is the reason
            most members open this at all. */}
        {asked.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-heading text-fg">{t("home.thisWeek")}</h2>
            {asked.map((one) => (
              <Card key={one.id} className="flex flex-col gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[length:var(--d-text-body)] font-semibold text-fg">
                    {t("home.servingAsked")}
                  </span>
                  <span className="text-[length:var(--d-text-body)] text-fg-muted">
                    {t("home.servingOn", { team: one.teamName, position: one.positionName })}
                  </span>
                  <span className="text-[length:var(--d-text-body)] text-fg-muted">
                    {onDay(one.occursOn)} {atTime(one.startsAt)}
                  </span>
                </span>
                <Respond id={one.id} church={session.tenantSlug} />
              </Card>
            ))}
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-heading text-fg">{t("home.mySchedule")}</h2>
            <Link
              href={`/home/serving?church=${session.tenantSlug}`}
              className="text-[length:var(--d-text-body)] font-medium text-primary"
            >
              {t("home.seeAll")}
            </Link>
          </div>

          {mine.serving.length > 0 ? (
            <Card className="flex flex-col divide-y divide-line p-0">
              {mine.serving.slice(0, 3).map((one) => (
                <span key={one.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <HandHeart className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[length:var(--d-text-body)] font-medium text-fg">
                      {one.positionName}
                    </span>
                    <span className="truncate text-caption text-fg-muted">
                      {one.teamName} {atTime(one.startsAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption text-fg-muted">
                    {onDay(one.occursOn)}
                  </span>
                </span>
              ))}
            </Card>
          ) : (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("home.noSchedule")}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-heading text-fg">{t("home.myGroups")}</h2>

          {mine.groups.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {mine.groups.map((group) => (
                <Card key={group.id} className="relative flex flex-col gap-2">
                  <Link
                    href={`/groups/${group.slug}?church=${session.tenantSlug}`}
                    className="text-heading text-fg after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
                  >
                    {group.name}
                  </Link>
                  <span className="text-[length:var(--d-text-body)] text-fg-muted">
                    {group.dayOfWeek !== null
                      ? `${dayName(group.dayOfWeek)}s${group.startsAt ? `, ${readableTime(group.startsAt)}` : ""}`
                      : ""}
                    {group.location ? ` ${group.location}` : ""}
                  </span>
                </Card>
              ))}
            </div>
          ) : null}

          <div>
            <Button asChild variant={mine.groups.length > 0 ? "secondary" : "primary"}>
              <Link href={`/groups?church=${session.tenantSlug}`}>
                {t("find.title")} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        {mine.household ? (
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-heading text-fg">{t("home.myHousehold")}</h2>
              <Link
                href={`/home/household?church=${session.tenantSlug}`}
                className="text-[length:var(--d-text-body)] font-medium text-primary"
              >
                {t("home.seeAll")}
              </Link>
            </div>
            <Card className="flex flex-col gap-2">
              {mine.household.members.map((one) => (
                <span key={one.id} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[length:var(--d-text-body)] font-medium text-fg">
                    {one.displayName}
                  </span>
                  <span className="shrink-0 text-caption text-fg-muted">
                    {t(`householdRole.${one.role}` as never)}
                  </span>
                </span>
              ))}
            </Card>
          </section>
        ) : null}

        <Link
          href={`/calendar?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start text-[length:var(--d-text-body)] font-medium text-primary"
        >
          <CalendarDays className="size-4" aria-hidden /> {t("nav.calendar")}
        </Link>
      </div>
    </AppShell>
  );
}
