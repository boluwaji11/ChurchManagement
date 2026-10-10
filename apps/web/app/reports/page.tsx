import Link from "next/link";
import {
  ArrowLeft, ArrowRight, CalendarCheck, HandCoins, TrendingUp, UserPlus,
} from "lucide-react";
import {
  withTenant, listSavedReports, countArchivedSavedReports, canManageChurch,
  canEditPeople, canReadIncidents, canReadGivingAmounts,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SavedReports } from "./saved";
import { StartReport } from "./start";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("reports.title"), church);
}

/**
 * R18.x. What a church can read back about itself.
 *
 * The three the product answers for every church, then whatever this church
 * built for itself.
 *
 * The built ones are bounded by a fixed catalogue of subjects and fields rather
 * than being a query language. A church picks what it is counting from a list
 * it recognises, and nobody is asked to pick a table or a join.
 *
 * Only what is built is listed. A page of greyed-out rows promising reports is
 * a page that teaches a church not to come back.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const params = await searchParams;
  const church = params.church;
  const session = await requireSession(church);

  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <Denied role={session.role} action="readReports" church={session.tenantSlug} />
      
    );
  }

  const here = `?church=${session.tenantSlug}`;

  /* R24.6. A report that was put away could be archived and then never seen
     again: nothing listed it and nothing brought it back. */
  const putAway = params.archived === "1";

  /* R18.x. A report belongs to whoever built it, so the reader is part of
     the question. */
  const who = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  const { saved, archivedCount } = await withTenant(who, async (tx) => ({
    saved: await listSavedReports(tx, who, putAway ? { archivedOnly: true } : {}),
    archivedCount: await countArchivedSavedReports(tx, who),
  }));

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
    /* R1.5. Only for somebody whose role carries the giving amounts. */
    ...(canReadGivingAmounts(session)
      ? [
          {
            href: `/reports/giving${here}`,
            icon: HandCoins,
            hue: "teal",
            title: t("reports.giving.title"),
            detail: t("reports.giving.detail"),
          },
        ]
      : []),
  ];

  return (
    <AppShell session={session} title={t("reports.title")}>
      {putAway ? (
        <Link
          href={`/reports?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("report.archived.back")}
        </Link>
      ) : null}

      {/* No heading: the bar above it already says Reports, and a page that
          says its own name twice reads as a page nobody laid out. */}
      {putAway ? null : (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <StartReport church={session.tenantSlug} />
        </div>
      )}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
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

      {saved.length > 0 ? (
        <SavedReports
          church={session.tenantSlug}
          putAway={putAway}
          /* R18.x. Only somebody who runs the church shares one. */
          canShare={canManageChurch(session)}
          reports={saved.map((one) => ({
            id: one.id, slug: one.slug, name: one.name,
            subject: one.subject, shared: one.shared,
          }))}
        />
      ) : putAway ? (
        <p className="text-fg-muted">{t("report.archived.none")}</p>
      ) : null}

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/reports?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("report.archived", archivedCount)}
        </Link>
      ) : null}
    </AppShell>
  );
}
