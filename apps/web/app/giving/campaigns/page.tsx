import Link from "next/link";
import { CalendarRange, Target, Users } from "lucide-react";
import {
  withTenant, getChurch, listCampaigns, listFunds, canManageGiving, canReadGivingAmounts,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/back-link";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Denied } from "@/components/denied";
import { Empty } from "@/components/empty";
import { money } from "@/lib/money";
import { longDate } from "@/lib/dates";
import { CampaignPanel } from "./campaign-panel";
import { Progress, PaceChip, percentOf, standingOf } from "./progress";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("campaigns.title"), church);
}

/**
 * R13.16. What the church is raising, and how far along it is.
 *
 * A campaign is a target over a period against one fund, so progress is the
 * gifts to that fund inside the period. Nothing is reconciled by hand and no
 * gift is counted twice.
 */
export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageGiving(session);

  if (!manage && !canReadGivingAmounts(session)) {
    return (
      <Denied role={session.role} action="manageGiving" church={session.tenantSlug} />
      
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => ({
    today: churchNow(
      (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
    ).date,
    campaigns: await listCampaigns(tx, { includeArchived: true }),
    funds: await listFunds(tx),
  }));

  const live = read.campaigns.filter((one) => !one.archived);
  const closed = read.campaigns.filter((one) => one.archived);
  const funds = read.funds.map((one) => ({ id: one.id, name: one.name }));

  return (
    <AppShell session={session} title={t("campaigns.title")} wide>
      <div className="flex flex-col gap-5">
        <BackLink href={`/giving?church=${session.tenantSlug}`} label={t("giving.count.back")} />

        {read.campaigns.length === 0 ? (
          <Empty
            icon="calendar"
            title={t("campaigns.none")}
            action={
              manage ? (
                <CampaignPanel church={session.tenantSlug} today={read.today} funds={funds} />
              ) : undefined
            }
          />
        ) : (
          <>
            {manage ? (
              <div className="flex justify-end">
                <CampaignPanel church={session.tenantSlug} today={read.today} funds={funds} />
              </div>
            ) : null}

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr))]">
              {live.map((one) => {
                const standing = standingOf({ ...one, today: read.today });
                return (
                <Link
                  key={one.id}
                  href={`/giving/campaigns/${one.slug}?church=${session.tenantSlug}`}
                  className="group flex flex-col gap-3.5 rounded-[14px] border border-line bg-surface p-5 no-underline shadow-sm transition-colors duration-instant hover:border-line-strong hover:bg-sunken"
                >
                  <span className="flex items-start gap-3">
                    {/* The campaign's mark, in the colour its pace is running
                        at, so a wall of cards reads before any of it is. */}
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-[10px] [&_svg]:size-[18px]"
                      style={{ background: standing.tone.tint, color: standing.tone.text }}
                    >
                      <Target aria-hidden />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col leading-5">
                      <span className="truncate text-[15px] font-bold text-fg">{one.name}</span>
                      <span className="truncate text-[13px] text-fg-muted">{one.fundName}</span>
                    </span>

                    <PaceChip standing={standing} />
                  </span>

                  <span className="flex flex-col gap-2">
                    <Progress standing={standing} />
                    <span className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span data-numeric className="font-semibold text-fg">
                        {t("campaigns.received", {
                          amount: money(one.receivedCents),
                          target: money(one.targetCents),
                        })}
                      </span>
                      <span
                        data-numeric
                        className="shrink-0 font-semibold"
                        style={{ color: standing.tone.text }}
                      >
                        {percentOf(standing)}
                      </span>
                    </span>
                  </span>

                  <hr className="border-0 border-t border-line" />

                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-fg-subtle">
                    <span className="flex items-center gap-1.5">
                      <CalendarRange className="size-3.5 shrink-0" aria-hidden />
                      {one.endsOn
                        ? t("campaigns.period", {
                            from: longDate(one.startsOn), to: longDate(one.endsOn),
                          })
                        : t("campaigns.openEnded", { from: longDate(one.startsOn) })}
                    </span>
                    {one.pledges > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5 shrink-0" aria-hidden />
                        {plural("campaigns.pledged", one.pledges, {
                          amount: money(one.pledgedCents),
                        })}
                      </span>
                    ) : null}
                  </span>
                </Link>
                );
              })}
            </div>
          </>
        )}

        {closed.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-label text-fg-muted">{t("campaigns.closed")}</h2>
            {closed.map((one) => (
              <Link
                key={one.id}
                href={`/giving/campaigns/${one.slug}?church=${session.tenantSlug}`}
                className="flex flex-wrap items-center justify-between gap-3 text-fg-muted"
              >
                <span>{one.name}</span>
                <span data-numeric className="text-[13px]">
                  {money(one.receivedCents)}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
