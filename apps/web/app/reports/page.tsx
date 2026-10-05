import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarCheck, TrendingUp, UserPlus } from "lucide-react";
import { canEditPeople, canReadIncidents } from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * R18.x. What a church can read back about itself.
 *
 * A list of named reports rather than a builder. A custom report builder is a
 * settled non-goal: it is the feature that makes Rock RMS unusable for the
 * churches this is for, and twenty questions answered well beats a tool for
 * asking any question badly.
 *
 * Only what is built is listed. A page of greyed-out rows promising reports is
 * a page that teaches a church not to come back.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canEditPeople(session) && !canReadIncidents(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const here = `?church=${session.tenantSlug}`;

  const reports = [
    {
      href: `/reports/attendance${here}`,
      icon: CalendarCheck,
      hue: "violet",
      title: t("reports.attendance.title"),
      detail: t("reports.attendance.detail"),
    },
    {
      href: `/reports/visitors${here}`,
      icon: UserPlus,
      hue: "amber",
      title: t("reports.visitors.title"),
      detail: t("reports.visitors.detail"),
    },
    {
      href: `/reports/growth${here}`,
      icon: TrendingUp,
      hue: "fern",
      title: t("reports.growth.title"),
      detail: t("reports.growth.detail"),
    },
  ];

  return (
    <AppShell session={session} title={t("reports.title")}>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {reports.map((one) => {
          const Icon = one.icon;
          return (
            <Link
              key={one.href}
              href={one.href}
              className="flex items-start gap-3 rounded-[14px] border border-line bg-surface p-5 transition-colors hover:bg-sunken"
            >
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-lg"
                style={{
                  background: `var(--hue-${one.hue}-tint)`,
                  color: `var(--hue-${one.hue}-key)`,
                }}
              >
                <Icon className="size-4" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold text-fg">{one.title}</span>
                <span className="text-caption leading-5 text-fg-muted">{one.detail}</span>
              </span>

              <ArrowRight className="mt-2 size-4 shrink-0 text-fg-subtle" aria-hidden />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
