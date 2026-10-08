import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, CornerDownRight, Download, Target } from "lucide-react";
import {
  withTenant, personForUser, listGifts, givingForPerson, onTheWay, getChurch,
  getStripeAccount, listRecurring, givingPage, pledgesForMember,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalShell, PortalTitle, Panel } from "@/components/portal-shell";
import type { Session } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { longDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { Progress, PaceChip, standingOf } from "./campaigns/progress";
import { GiftState } from "./gift-state";
import { giftRows } from "./rows";
import { RepeatMark } from "./repeat-mark";
import * as React from "react";
import { ChangeCard } from "./change-card";
import { GiveHere } from "./give-here";
import { CardSaved } from "./card-saved";
import { GiftThanks } from "./gift-thanks";
import { StopRepeating } from "./stop-repeating";

/**
 * R13.19, R17.4. A member's own giving, and their own statement.
 *
 * Always theirs to read, whatever their role says about anybody else's. This
 * is the screen that means a church secretary is not asked for a copy of a
 * statement in the second week of January.
 */
export async function MyGiving({ session }: { session: Session }) {
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const mine = await withTenant(ctx, async (tx) => {
    const self = await personForUser(tx, session.userId);
    if (!self) return null;

    const today = churchNow(
      (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
    ).date;
    const year = today.slice(0, 4);

    return {
      year,
      today,
      self,
      /*
       * R1.5. Their own gifts, read as themselves. listGifts hides amounts
       * from anybody without the permission, so this asks as somebody who has
       * it for their own record and nobody else's.
       */
      gifts: await listGifts(
        tx,
        { ...ctx, permissions: [...(ctx.permissions ?? []), "giving.amounts"] },
        { memberId: self, limit: 200 },
      ),
      total: await givingForPerson(tx, self, { from: `${year}-01-01`, to: `${year}-12-31` }),
      /* R13.2. Their own bank transfer, before the bank has moved it. */
      coming: await onTheWay(tx, self),
      /** R13.6. Whether the church can take a gift online at all. */
      online: (await getStripeAccount(tx))?.chargesEnabled ?? false,
      /** R13.3. What they have set to repeat, if anything. */
      /* R1.5. Their own, read as themselves, matched on the record rather
         than on a name that two people in a household might share. */
      repeating: await listRecurring(
        tx,
        { ...ctx, permissions: [...(ctx.permissions ?? []), "giving.amounts"] },
        { activeOnly: true, memberId: self },
      ),
      /* R13.16, R17.4. What they have pledged, and how far they have got. */
      pledges: await pledgesForMember(
        tx,
        { ...ctx, permissions: [...(ctx.permissions ?? []), "giving.amounts"] },
        self,
      ),
    };
  });

  if (!mine) redirect(`/home?church=${session.tenantSlug}`);

  /* R13.6. The church's own giving page, read for the funds it offers. */
  const page = mine.online ? await givingPage(session.tenantSlug) : null;

  return (
    <PortalShell session={session} tab={t("mine.giving.title")}>
      <PortalTitle
        title={t("mine.giving.title")}
        action={
          /* R17.4. Giving happens in a panel on this screen: somebody
             already here came to give, and a page of their own to go to and
             come back from is two navigations for one press. */
          mine.online && page ? (
            <GiveHere
              slug={page.slug}
              church={page.name}
              funds={page.funds}
              accountId={page.accountId}
              publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
              giver={{ name: session.displayName, email: session.email }}
            />
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        {/* R13.3, R13.6. Said once, when Stripe sends them back. */}
        <React.Suspense fallback={null}>
          <CardSaved />
          {page ? <GiftThanks slug={page.slug} church={page.name} /> : null}
        </React.Suspense>
        <Panel className="flex flex-wrap items-end justify-between gap-4">
          <span className="flex flex-col">
            <span data-numeric className="font-display text-[34px] leading-[40px] text-fg">
              {money(mine.total.cents)}
            </span>
            <span className="text-caption text-fg-subtle">
              {t("home.myGiving.year", { year: mine.year })}
            </span>
            {mine.coming.cents > 0 ? (
              <span className="text-caption text-warning-text">
                {t("giving.onTheWay", { amount: money(mine.coming.cents) })}
              </span>
            ) : null}
          </span>

          {mine.total.gifts > 0 ? (
            <Link
              href={`/giving/statement?church=${session.tenantSlug}&year=${mine.year}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 font-medium text-primary no-underline"
            >
              <Download className="size-4" aria-hidden /> {t("mine.giving.statement")}
            </Link>
          ) : null}
        </Panel>

        {/* R13.16, R17.4. Their own pledges, so somebody who promised in
            October can see in March what is left of it without asking. */}
        {mine.pledges.length > 0 ? (
          <Panel className="flex flex-col gap-3">
            <span className="font-medium text-fg">{t("pledge.mine")}</span>

            {mine.pledges.map((one) => {
              const kept = one.givenCents >= one.amountCents;
              const standing = standingOf({
                receivedCents: one.givenCents,
                targetCents: one.amountCents,
                startsOn: one.startsOn,
                endsOn: one.endsOn,
                today: mine.today,
                archived: one.archived,
              });

              return (
                <div
                  key={one.id}
                  className="flex flex-col gap-2 border-t border-line pt-3 first-of-type:border-0 first-of-type:pt-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <Target className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                      <span className="truncate font-medium text-fg">{one.campaignName}</span>
                      {kept ? (
                        <span
                          className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold"
                          style={{ background: "var(--success-soft)", color: "var(--success-text)" }}
                        >
                          <CheckCircle2 className="size-3" aria-hidden />
                          {t("pledge.kept")}
                        </span>
                      ) : (
                        <PaceChip standing={standing} />
                      )}
                    </span>

                    <span data-numeric className="shrink-0 text-caption text-fg-muted">
                      {t("pledge.given", { amount: money(one.givenCents) })}
                      {" \u00b7 "}
                      {t("pledge.mine.of", { amount: money(one.amountCents) })}
                    </span>
                  </div>

                  <Progress standing={standing} height={6} />

                  {kept ? null : (
                    <span data-numeric className="text-caption text-fg-subtle">
                      {t("pledge.toGo", {
                        amount: money(Math.max(0, one.amountCents - one.givenCents)),
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </Panel>
        ) : null}

        {/* R13.3, R13.19. What they have set to repeat, and the way to
            stop it without ringing the church. */}
        {mine.repeating.length > 0 ? (
          <Panel className="flex flex-col gap-3">
            <span className="font-medium text-fg">{t("giving.recurring")}</span>

            {mine.repeating.map((one) => (
              <div
                key={one.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 first-of-type:border-0 first-of-type:pt-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span data-numeric className="font-medium text-fg">
                    {[
                      money(one.amountCents),
                      t(
                        `giving.recurring.every.${one.interval}${
                          one.intervalCount > 1 ? `.${one.intervalCount}` : ""
                        }` as never,
                      ),
                    ].join(" \u00b7 ")}
                  </span>
                  <span className="text-caption text-fg-subtle">
                    {[
                      one.fundName,
                      one.nextOn ? t("giving.recurring.next", { date: longDate(one.nextOn) }) : null,
                    ]
                      .filter(Boolean)
                      .join(" \u00b7 ")}
                  </span>
                </span>

                <span className="flex items-center gap-3">
                  {/* Stripe's own fields, drawn in a panel on this page. */}
                  <ChangeCard
                    id={one.id}
                    church={session.tenantSlug}
                    publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
                  />
                  <StopRepeating
                    id={one.id}
                    church={session.tenantSlug}
                    label={money(one.amountCents)}
                  />
                </span>
              </div>
            ))}
          </Panel>
        ) : null}

        {mine.gifts.length === 0 ? (
          <p className="text-fg-muted">{t("mine.giving.none")}</p>
        ) : (
          <Panel className="flex flex-col divide-y divide-line px-5 py-0">
            <span
              className="grid items-center gap-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-fg [grid-template-columns:148px_minmax(0,1fr)_80px_110px_120px]"
            >
              <span>{t("giving.col.date")}</span>
              <span>{t("giving.col.fund")}</span>
              <span>{t("giving.col.method")}</span>
              <span>{t("giving.col.status")}</span>
              <span className="text-right">{t("giving.col.amount")}</span>
            </span>

            {giftRows(mine.gifts).map((row) => (
              <span
                key={row.key}
                className={`grid items-center gap-3 py-3 [grid-template-columns:148px_minmax(0,1fr)_80px_110px_120px] ${
                  row.kind === "refund"
                    ? "italic pt-2 relative before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-line before:content-['']"
                    : row.tied
                      ? "border-b-0 pb-2"
                      : ""
                }`}
              >
                {/* R13.15. The turn marks the refund as belonging to the gift
                    under it, and the rule between them comes out. */}
                <span className="flex items-center gap-1 whitespace-nowrap text-caption text-fg-subtle">
                  {row.kind === "refund" ? (
                    <CornerDownRight className="size-3.5 shrink-0" aria-hidden />
                  ) : null}
                  {longDate(row.on)}
                </span>
                <span className="min-w-0 truncate text-fg">{row.gift.fundName}</span>
                <span className="text-caption text-fg-subtle">
                  {t(`giving.method.${row.gift.method}` as never)}
                </span>
                {/* R13.2, R13.15. Their bank transfer before it arrives, and
                    anything the church gave back, on its own line. */}
                <span className="flex text-caption">
                  <GiftState status={row.status} audience="giver" />
                </span>
                <span
                  data-numeric
                  className={`text-right ${
                    row.status === "settled" ? "text-fg" : "text-fg-subtle"
                  }`}
                >
                  <span className="flex items-center justify-end gap-1.5">
                    {row.gift.recurring && row.kind === "gift" ? <RepeatMark /> : null}
                    {row.gift.inKindDescription && row.kind === "gift"
                      ? row.gift.inKindDescription
                      : money(row.amountCents)}
                  </span>
                </span>
              </span>
            ))}
          </Panel>
        )}
      </div>
    </PortalShell>
  );
}
