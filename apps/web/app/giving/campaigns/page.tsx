import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getChurch, listCampaigns, listFunds, canManageGiving, canReadGivingAmounts,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Denied } from "@/components/denied";
import { Empty } from "@/components/empty";
import { money } from "@/lib/money";
import { longDate } from "@/lib/dates";
import { CampaignPanel } from "./campaign-panel";
import { Progress } from "./progress";
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
        <Link
          href={`/giving?church=${session.tenantSlug}`}
          className="flex w-fit items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("giving.count.back")}
        </Link>

        {read.campaigns.length === 0 ? (
          <Empty
            icon="calendar"
            title={t("campaigns.none")}
            body={t("campaigns.add")}
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

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
              {live.map((one) => (
                <Link
                  key={one.id}
                  href={`/giving/campaigns/${one.slug}?church=${session.tenantSlug}`}
                  className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5 no-underline hover:bg-sunken"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate font-semibold text-fg">
                      {one.name}
                    </span>
                    <span className="shrink-0 text-[13px] text-fg-subtle">{one.fundName}</span>
                  </span>

                  <Progress received={one.receivedCents} target={one.targetCents} />

                  <span className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                    <span data-numeric className="font-medium text-fg">
                      {t("campaigns.received", {
                        amount: money(one.receivedCents),
                        target: money(one.targetCents),
                      })}
                    </span>
                    <span className="text-fg-muted">
                      {plural("campaigns.pledged", one.pledges, {
                        amount: money(one.pledgedCents),
                      })}
                    </span>
                  </span>

                  <span className="text-[12px] text-fg-subtle">
                    {[longDate(one.startsOn), one.endsOn ? longDate(one.endsOn) : null]
                      .filter(Boolean)
                      .join(" to ")}
                  </span>
                </Link>
              ))}
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
