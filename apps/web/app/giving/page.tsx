import Link from "next/link";
import {
  withTenant, getChurch, listFunds, fundTotals, listBatches, listGifts, givingTotals,
  getStripeAccount, canManageGiving, canReadGivingAmounts,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Denied } from "@/components/denied";
import { Empty } from "@/components/empty";
import { Figure } from "@/app/reports/figure";
import { money, roundMoney } from "@/lib/money";
import { shortDate } from "@/lib/dates";
import { StartCount } from "./start-count";
import { GiftPanel } from "./gift-panel";

export const dynamic = "force-dynamic";

/**
 * R13.21. What has come in, and what is still being counted.
 *
 * The screen a treasurer opens on a Monday: the two totals they are asked for,
 * the funds those totals are made of, the counts the team has run, and the last
 * few gifts so a mistake is caught the day it is made.
 */
export default async function GivingPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageGiving(session);
  const amounts = canReadGivingAmounts(session);

  if (!manage && !amounts) {
    return (
      <AppShell session={session} title={t("giving.title")}>
        <Denied />
      </AppShell>
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => {
    const profile = await getChurch(tx, session.tenantId);
    const today = churchNow(profile?.timezone ?? "America/Chicago").date;
    const year = today.slice(0, 4);
    const month = today.slice(0, 7);

    return {
      today,
      funds: await listFunds(tx),
      byFund: await fundTotals(tx, { from: `${year}-01-01`, to: `${year}-12-31` }),
      thisYear: await givingTotals(tx, { from: `${year}-01-01`, to: `${year}-12-31` }),
      thisMonth: await givingTotals(tx, { from: `${month}-01`, to: today }),
      counts: await listBatches(tx, 6),
      recent: await listGifts(tx, ctx, { limit: 8 }),
      stripe: await getStripeAccount(tx),
    };
  });

  const nothing = read.counts.length === 0 && read.recent.length === 0;

  return (
    <AppShell session={session} title={t("giving.title")} wide>
      <div className="flex flex-col gap-7">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <Figure
            label={t("giving.month")}
            value={roundMoney(read.thisMonth.cents)}
            sub={t("giving.givers.sub", { count: String(read.thisMonth.gifts) })}
            hue="fern"
          />
          <Figure
            label={t("giving.year")}
            value={roundMoney(read.thisYear.cents)}
            sub={t("giving.givers.sub", { count: String(read.thisYear.gifts) })}
            hue="violet"
          />
          <Figure
            label={t("giving.givers")}
            value={String(read.thisYear.givers)}
            sub={
              read.stripe?.chargesEnabled ? t("stripe.state.ready") : t("stripe.state.none")
            }
            hue="sky"
          />
        </div>

        {nothing ? (
          <Empty
            icon="calendar"
            title={t("giving.empty.title")}
            body={t("giving.empty.body")}
            action={
              manage ? (
                <StartCount church={session.tenantSlug} today={read.today} />
              ) : undefined
            }
          />
        ) : null}

        <div className="grid items-start gap-6 lg:[grid-template-columns:minmax(0,1fr)_minmax(260px,320px)]">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex flex-wrap items-baseline gap-3 font-display text-[22px] leading-[28px] text-fg">
                {t("giving.counts")}
                {/* R13.17. January's work, a press away from the Monday one. */}
                <Link
                  href={`/giving/statements?church=${session.tenantSlug}`}
                  className="text-[13px] font-medium text-primary"
                >
                  {t("giving.statements")}
                </Link>
              </h2>
              {manage ? (
                <div className="flex flex-wrap items-center gap-2">
                  <GiftPanel
                    church={session.tenantSlug}
                    today={read.today}
                    funds={read.funds.map((one) => ({ id: one.id, name: one.name }))}
                  />
                  <StartCount church={session.tenantSlug} today={read.today} />
                </div>
              ) : null}
            </div>

            {read.counts.length === 0 ? (
              <p className="text-fg-muted">{t("giving.counts.none")}</p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-line bg-surface">
                {read.counts.map((count) => (
                  <li key={count.id}>
                    <Link
                      href={`/giving/counts/${count.id}?church=${session.tenantSlug}`}
                      className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-sunken"
                    >
                      <span className="w-[120px] shrink-0 text-[13px] font-medium text-fg-subtle">
                        {shortDate(count.receivedOn)}
                      </span>
                      <span className="min-w-0 flex-1 font-medium text-fg">{count.name}</span>
                      <span
                        className={`flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-semibold ${
                          count.closed
                            ? "bg-sunken text-fg-muted"
                            : "bg-primary-soft text-primary"
                        }`}
                      >
                        {count.closed ? t("giving.count.closed") : t("giving.count.open")}
                      </span>
                      <span data-numeric className="w-[160px] shrink-0 text-right font-mono text-[13px] text-fg-muted">
                        {t("giving.count.entered", {
                          entered: money(count.enteredCents),
                          expected: money(count.expectedCents),
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-[22px] leading-[28px] text-fg">
                {t("giving.recent")}
              </h2>
              {/* R13.23. Everything recorded, as a spreadsheet. */}
              <a
                href={`/api/giving?church=${session.tenantSlug}`}
                className="font-medium text-primary"
              >
                {t("giving.export")}
              </a>
            </div>
            {read.recent.length === 0 ? (
              <p className="text-fg-muted">{t("giving.recent.none")}</p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-line bg-surface">
                {read.recent.map((gift) => (
                  <li
                    key={gift.id}
                    className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                  >
                    <span className="w-[120px] shrink-0 text-[13px] text-fg-subtle">
                      {shortDate(gift.receivedOn)}
                    </span>
                    <span className="min-w-0 flex-1 text-fg">
                      {gift.memberName ?? t("giving.gift.anonymous")}
                    </span>
                    <span className="w-[140px] shrink-0 truncate text-[13px] text-fg-muted">
                      {gift.fundName}
                    </span>
                    <span className="w-[80px] shrink-0 text-[13px] text-fg-muted">
                      {t(`giving.method.${gift.method}` as never)}
                    </span>
                    <span data-numeric className="w-[100px] shrink-0 text-right font-mono text-fg">
                      {gift.inKindDescription ? "" : money(gift.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-medium text-fg-subtle">{t("giving.funds")}</h2>
              <Link
                href={`/settings/funds?church=${session.tenantSlug}`}
                className="text-[13px] font-medium text-primary"
              >
                {t("giving.funds.manage")}
              </Link>
            </div>

            <ul className="flex flex-col gap-2">
              {read.funds.map((fund) => (
                <li
                  key={fund.id}
                  className="flex flex-col rounded-[12px] border border-line bg-surface px-3.5 py-3"
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">
                      {fund.name}
                    </span>
                    {fund.restricted ? (
                      <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                        {t("giving.restricted")}
                      </span>
                    ) : null}
                  </span>
                  <span data-numeric className="mt-1 font-mono text-[15px] text-fg">
                    {money(read.byFund[fund.id]?.cents ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
