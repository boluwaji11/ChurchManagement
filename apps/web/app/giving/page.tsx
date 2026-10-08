import Link from "next/link";
import {
  withTenant, getChurch, listFunds, fundTotals, listBatches, listGifts, givingTotals, onTheWay,
  getStripeAccount, listRecurring, recurringMonthly,
  canManageGiving, canReadGivingAmounts,
} from "@connectapp/db";
import { CornerDownRight, Printer } from "lucide-react";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { MyGiving } from "./mine";
import { Empty } from "@/components/empty";
import { Figure } from "@/app/reports/figure";
import { money } from "@/lib/money";
import { longDate } from "@/lib/dates";
import { StartCount } from "./start-count";
import { GiftPanel } from "./gift-panel";
import { RefundGift } from "./refund";
import { AttachGift } from "./attach";
import { GiftState } from "./gift-state";
import { giftRows } from "./rows";
import { RepeatMark } from "./repeat-mark";
import { Download } from "@/components/download";
import { StopRepeating } from "./stop-repeating";
import { Tooltip } from "@connectapp/ui";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. Giving to whoever runs it, My giving to everybody else. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const theirs = !canManageGiving(session) && !canReadGivingAmounts(session);
  return tabMetadata(t(theirs ? "mine.giving.title" : "giving.title"), church);
}

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

  /*
   * R17.4. The same address read from the other side.
   *
   * A member opening Giving is asking about their own, the way opening Groups
   * asks which groups they are in. Two routes for one word would have meant
   * two places for a link to point and one of them always wrong.
   */
  if (!manage && !amounts) return <MyGiving session={session} />;

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
      /* R13.2. Bank transfers authorised and not yet arrived. */
      coming: await onTheWay(tx),
      // R13.3. What the church is expecting without anybody doing anything.
      recurring: await listRecurring(tx, ctx, { activeOnly: true }),
      expected: await recurringMonthly(tx),
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
            value={money(read.thisMonth.cents)}
            sub={plural("giving.givers.sub", read.thisMonth.gifts)}
            hue="fern"
          />
          <Figure
            label={t("giving.year")}
            value={money(read.thisYear.cents)}
            sub={plural("giving.givers.sub", read.thisYear.gifts)}
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

        {/* R13.2. Money a giver has authorised that the bank has not moved
            yet. It is in none of the figures above, so it says so here. */}
        {read.coming.cents > 0 ? (
          <p className="-mt-4 m-0 text-[13px] text-warning-text">
            {t("giving.onTheWay", { amount: money(read.coming.cents) })}
          </p>
        ) : null}

        {nothing ? (
          <Empty
            icon="calendar"
            title={t("giving.empty.title")}
            body={t("giving.empty.body")}
            action={
              manage ? (
                <StartCount
                    church={session.tenantSlug}
                    today={read.today}
                    funds={read.funds.map((one) => ({ id: one.id, name: one.name }))}
                  />
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
                  href={`/giving/payouts?church=${session.tenantSlug}`}
                  className="text-[13px] font-medium text-primary"
                >
                  {t("payouts.title")}
                </Link>
                <Link
                  href={`/giving/campaigns?church=${session.tenantSlug}`}
                  className="text-[13px] font-medium text-primary"
                >
                  {t("campaigns.title")}
                </Link>
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
                  <StartCount
                    church={session.tenantSlug}
                    today={read.today}
                    funds={read.funds.map((one) => ({ id: one.id, name: one.name }))}
                  />
                </div>
              ) : null}
            </div>

            {read.counts.length === 0 ? (
              <p className="text-fg-muted">{t("giving.counts.none")}</p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-line bg-surface">
                {/* R13.10. A session is what was counted at one service: the
                    day, what the church called it, the fund it went to and
                    how much there was, with the slip for the bank on it. */}
                <li className="grid items-center gap-3 border-b border-line bg-sunken px-4 py-2 text-[12px] font-bold uppercase tracking-[0.04em] text-fg [grid-template-columns:152px_minmax(0,1fr)_140px_120px_44px]">
                  <span>{t("giving.col.date")}</span>
                  <span>{t("giving.count.name")}</span>
                  <span>{t("giving.col.fund")}</span>
                  <span className="text-right">{t("giving.count.counted")}</span>
                  <span />
                </li>

                {read.counts.map((count) => (
                  <li
                    key={count.id}
                    className="grid items-center gap-3 border-b border-line px-4 py-3 last:border-0 [grid-template-columns:152px_minmax(0,1fr)_140px_120px_44px]"
                  >
                    <span className="whitespace-nowrap text-[13px] text-fg-subtle">
                      {longDate(count.receivedOn)}
                    </span>
                    <span className="min-w-0 truncate font-medium text-fg">{count.name}</span>
                    <span className="truncate text-[13px] text-fg-muted">{count.funds}</span>
                    <span data-numeric className="text-right text-fg">
                      {money(count.enteredCents)}
                    </span>
                    <span className="flex justify-end">
                      <Tooltip content={t("giving.count.slip")}>
                        <a
                          href={`/giving/counts/${count.slug}/slip?church=${session.tenantSlug}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={t("giving.count.slip")}
                          className="inline-flex size-[var(--d-tap)] items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-[var(--d-icon)]"
                        >
                          <Printer />
                        </a>
                      </Tooltip>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-[22px] leading-[28px] text-fg">
                {t("giving.recent")}
              </h2>
              {/* R13.23. Everything recorded, as a spreadsheet. */}
              <Download
                href={`/api/giving?church=${session.tenantSlug}`}
                file={`giving-${session.tenantSlug}.csv`}
                label={t("download.building")}
                title={t("giving.export")}
                className="font-medium text-primary"
              >
                {t("giving.export")}
              </Download>
            </div>
            {read.recent.length === 0 ? (
              <p className="text-fg-muted">{t("giving.recent.none")}</p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-line bg-surface">
                {/* The column names, so a treasurer reading down the list
                    knows which cell is which. */}
                <li
                  className="grid items-center gap-3 border-b border-line bg-sunken px-4 py-2 text-[12px] font-bold uppercase tracking-[0.04em] text-fg [grid-template-columns:152px_minmax(0,1fr)_140px_90px_110px_110px_72px]"
                >
                  <span>{t("giving.col.date")}</span>
                  <span>{t("giving.col.giver")}</span>
                  <span>{t("giving.col.fund")}</span>
                  <span>{t("giving.col.method")}</span>
                  <span className="text-right">{t("giving.col.amount")}</span>
                  <span>{t("giving.col.status")}</span>
                  <span />
                </li>

                {giftRows(read.recent).map((row) => {
                  const gift = row.gift;
                  const back = row.kind === "refund";

                  return (
                  <li
                    key={row.key}
                    className={`grid items-center gap-3 border-b border-line px-4 py-3 last:border-0 [grid-template-columns:152px_minmax(0,1fr)_140px_90px_110px_110px_72px] ${
                      back
                        ? "italic pt-2 relative before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-line before:content-['']"
                        : row.tied
                          ? "border-b-0 pb-2"
                          : ""
                    }`}
                  >
                    {/* R13.15. The turn marks the refund as belonging to the
                        gift under it, and the rule between them comes out. */}
                    <span className="flex items-center gap-1 whitespace-nowrap text-[13px] text-fg-subtle">
                      {back ? <CornerDownRight className="size-3.5 shrink-0" aria-hidden /> : null}
                      {longDate(row.on)}
                    </span>

                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-fg">
                        {gift.memberName ?? t("giving.gift.anonymous")}
                      </span>
                      {/* R13.18. A gift on nobody's record is on nobody's
                          statement either, so it says so here. */}
                      {gift.memberId === null && !back ? (
                        <span className="text-[12px] text-fg-subtle">
                          {t("giving.gift.unattached")}
                        </span>
                      ) : null}
                    </span>

                    <span className="truncate text-[13px] text-fg-muted">{gift.fundName}</span>

                    <span className="text-[13px] text-fg-muted">
                      {t(`giving.method.${gift.method}` as never)}
                    </span>

                    <span
                      data-numeric
                      className={`text-right ${
                        gift.status === "settled" && !back ? "text-fg" : "text-fg-subtle"
                      }`}
                    >
                      <span className="flex items-center justify-end gap-1.5">
                        {/* R13.3. Collected by a repeating gift, which is
                            money the church can plan on. */}
                        {gift.recurring && !back ? <RepeatMark /> : null}
                        {gift.inKindDescription && !back ? "" : money(row.amountCents)}
                      </span>
                    </span>

                    {/* R13.2, R13.15. Where the money has got to: on its way,
                        returned by the bank, or given back by the church. */}
                    <span className="flex text-[13px]">
                      <GiftState status={row.status} reason={gift.failureReason} />
                    </span>

                    {/* R13.15, R13.18. The two things done to a gift, in the
                        same place on every row whether or not they apply. */}
                    <span className="flex items-center justify-end gap-1">
                      {manage && gift.memberId === null && !back ? (
                        <AttachGift
                          church={session.tenantSlug}
                          gift={{ id: gift.id, typed: gift.memberName }}
                        />
                      ) : null}
                      {manage && !back && !gift.inKindDescription && gift.status === "settled"
                        && gift.amountCents > gift.refundedCents ? (
                        <RefundGift
                          church={session.tenantSlug}
                          gift={{
                            id: gift.id,
                            amountCents: gift.amountCents,
                            refundedCents: gift.refundedCents,
                            method: gift.method,
                            giver: gift.memberName,
                          }}
                        />
                      ) : null}
                    </span>
                  </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-6">
            {/* R13.3. What repeats, which is the number a church plans on. */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-medium text-fg-subtle">
                  {t("giving.recurring")}
                </h2>
                {read.recurring.length > 0 ? (
                  <span data-numeric className="text-[13px] text-fg-muted">
                    {t("giving.recurring.monthly", { amount: money(read.expected) })}
                  </span>
                ) : null}
              </div>

              {read.recurring.length === 0 ? (
                <p className="text-[13px] text-fg-muted">{t("giving.recurring.none")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {read.recurring.slice(0, 6).map((one) => (
                    <li
                      key={one.id}
                      className="flex items-center gap-2 rounded-[12px] border border-line bg-surface px-3.5 py-2.5"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium text-fg">
                          {one.name || t("giving.gift.anonymous")}
                        </span>
                        <span className="text-[12px] text-fg-subtle">
                          {[
                            one.fundName,
                            t(
                              `giving.recurring.every.${one.interval}${
                                one.intervalCount > 1 ? `.${one.intervalCount}` : ""
                              }` as never,
                            ),
                            one.nextOn
                              ? t("giving.recurring.next", { date: longDate(one.nextOn) })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" \u00b7 ")}
                        </span>
                        {/* R13.8. A gift that has stopped collecting says so
                            here, rather than being noticed in March. */}
                        {one.status === "past_due" ? (
                          <span
                            className="text-[12px] font-medium"
                            style={{ color: "var(--hue-amber-key)" }}
                          >
                            {t("giving.recurring.status.past_due")}
                          </span>
                        ) : null}
                      </span>
                      <span data-numeric className="shrink-0 text-[13px] text-fg">
                        {money(one.amountCents)}
                      </span>
                      {/* R13.3. A treasurer is asked to stop one on a giver's
                          behalf, so it is stopped from here as well. */}
                      {manage ? (
                        <StopRepeating
                          id={one.id}
                          church={session.tenantSlug}
                          label={money(one.amountCents)}
                          who={one.name || null}
                          compact
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-medium text-fg-subtle">{t("giving.funds")}</h2>
              <Link
                href={`/settings/funds?church=${session.tenantSlug}`}
                className="text-[13px] font-medium text-primary"
              >
                {t("giving.funds.manage")}
              </Link>
            </div>

            {/* R13.9. The board's question is what the church can spend, so
                the funds are read in two groups with a total on each. Money
                given for a building is in the bank and is not available. */}
            {([true, false] as const).map((restricted) => {
              const group = read.funds.filter((one) => one.restricted === restricted);
              if (group.length === 0) return null;
              const held = group.reduce(
                (sum, one) => sum + (read.byFund[one.id]?.cents ?? 0),
                0,
              );

              return (
                <div key={String(restricted)} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <Tooltip
                      content={
                        restricted
                          ? t("giving.funds.restrictedWhy")
                          : t("giving.funds.availableWhy")
                      }
                    >
                      <span className="text-[12px] font-bold uppercase tracking-[0.04em] text-fg">
                        {restricted
                          ? t("giving.funds.restricted")
                          : t("giving.funds.available")}
                      </span>
                    </Tooltip>
                    <span data-numeric className="text-[13px] text-fg-muted">
                      {money(held)}
                    </span>
                  </div>

                  <ul className="flex flex-col gap-2">
                    {group.map((fund) => (
                      <li
                        key={fund.id}
                        className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-3.5 py-3"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-fg">
                          {fund.name}
                        </span>
                        <span data-numeric className="shrink-0 text-[15px] text-fg">
                          {money(read.byFund[fund.id]?.cents ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
