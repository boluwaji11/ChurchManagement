import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { withTenant, findGroups, personForUser, canEditPeople, canReadIncidents } from "@connectapp/db";
import { Button, Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { BrandRule } from "@/components/brand-rule";
import { requireSession } from "@/lib/session";

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
 * R9.5. The whole of the product for somebody who is not staff.
 *
 * The groups they are in, and a way to find another. There is no directory of
 * the church here: looking the congregation up is not something a member does,
 * and a search box over everybody's households is a search box over everybody's
 * households however carefully the fields are gated. The printed directory
 * (R3.5) is the church handing something out, which is a different act.
 *
 * A member signs in two or three times a year. When the portal lands in 1.0
 * (R17) it grows from this screen: giving, their serving schedule, checking
 * their own children in.
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
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      return (await findGroups(tx, { memberId: self })).filter((group) => group.mine);
    },
  );

  return (
    <AppShell
      session={session}
      title={t("home.hello", { name: session.displayName.split(" ")[0] ?? session.displayName })}
      density="portal"
      max="max-w-xl"
    >
      <div className="flex flex-col gap-8">
      {/* R1.1. The church's colour, on the screen its members are handed. */}
      <BrandRule tenantId={session.tenantId} role={session.role} />
      <Link
        href={`/settings?church=${session.tenantSlug}`}
        className="text-[length:var(--d-text-body)] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
      >
        {t("home.mySettings")}
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-heading text-fg">{t("home.myGroups")}</h2>

        {mine.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((group) => (
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
          <Button asChild variant={mine.length > 0 ? "secondary" : "primary"}>
            <Link href={`/groups?church=${session.tenantSlug}`}>
              {t("find.title")} <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      </div>
    </AppShell>
  );
}
