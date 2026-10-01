import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  withTenant, getChurch, memberDirectory, findGroups, personForUser,
  directoryPreferencesFor, canEditPeople, canReadIncidents,
} from "@hearth/db";
import { Avatar, Badge, Button, Card, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Households } from "../directory/households";

export const dynamic = "force-dynamic";

const dayName = (day: number) =>
  new Date(2024, 0, 7 + day).toLocaleDateString("en-US", { weekday: "long" });

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const at = new Date();
  at.setHours(h ?? 0, m ?? 0, 0, 0);
  return at
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
};

/**
 * R3.1, R9.5. The whole of the product for somebody who is not staff.
 *
 * One screen: what the church knows of me, the groups I am in, and the people.
 * A member signs in two or three times a year, and a navigation bar of sections
 * they cannot open is how a church ends up with a product nobody uses. When the
 * portal lands in 1.0 (R17) this is what it grows from.
 */
export default async function MemberHomePage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // Staff have their own screens, and this is not one of them.
  if (canEditPeople(session.role) || canReadIncidents(session.role)) {
    redirect(`/people?church=${session.tenantSlug}`);
  }

  const { me, mine, households, published } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => {
      const today = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date;
      const self = await personForUser(tx, session.userId);
      const groups = await findGroups(tx, { personId: self });
      return {
        me: self,
        mine: groups.filter((group) => group.mine),
        households: await memberDirectory(tx, { asOf: today }),
        published: self ? await directoryPreferencesFor(tx, self) : null,
      };
    },
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        <h1 className="font-display text-display text-fg">
          {t("home.hello", { name: session.displayName.split(" ")[0] ?? session.displayName })}
        </h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-heading text-fg">{t("home.myGroups")}</h2>

          {mine.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((group) => (
                <Card key={group.id} className="relative flex flex-col gap-2">
                  <Link
                    href={`/groups/${group.id}?church=${session.tenantSlug}`}
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
            <Button asChild variant={mine.length > 0 ? "secondary" : "primary"}>
              <Link href={`/groups?church=${session.tenantSlug}`}>
                {t("find.title")} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-heading text-fg">{t("memberDirectory.title")}</h2>
            {me ? (
              <Button asChild variant="ghost">
                <Link href={`/settings/directory?church=${session.tenantSlug}`}>
                  {t("home.myEntry")}
                </Link>
              </Button>
            ) : null}
          </div>

          {published && !published.listed ? (
            <span className="flex flex-wrap items-center gap-2">
              <Avatar name={session.displayName} id={session.userId} />
              <Badge tone="neutral">{t("home.hidden")}</Badge>
            </span>
          ) : null}

          <Households church={session.tenantSlug} households={households} />
        </section>
      </main>
    </>
  );
}
