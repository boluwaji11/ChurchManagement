import { redirect } from "next/navigation";
import {
  Banknote, CheckCircle2, CornerDownRight, CreditCard, FileText, Repeat, Target,
} from "lucide-react";
import {
  withTenant, personForUser, listGifts, givingForPerson, onTheWay, getChurch,
  getStripeAccount, listRecurring, givingPage, pledgesForMember, givingYears,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { PortalShell, PortalTitle } from "@/components/portal-shell";
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
import { Panel as Block, Nothing } from "./panel";
import { Figure } from "@/app/reports/figure";
import { MyStatement } from "./my-statement";
import { ResizableTable } from "@/components/resizable-columns";

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
      /* R13.19. Every year they have given in, for the statement picker. */
      years: await givingYears(tx, self),
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

  const pledgedCents = mine.pledges.reduce((sum, one) => sum + one.amountCents, 0);

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

      <div className="flex flex-col gap-5">
        {/* R13.3, R13.6. Said once, when Stripe sends them back. */}
        <React.Suspense fallback={null}>
          <CardSaved />
          {page ? <GiftThanks slug={page.slug} church={page.name} /> : null}
        </React.Suspense>

        {/* R13.19. What they have given, what repeats, and what they have
            promised, read the way the church reads its own. */}
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(215px,1fr))]">
          <Figure
            icon={<Banknote />}
            label={t("mine.giving.thisYear", { year: mine.year })}
            value={money(mine.total.cents)}
            sub={plural("giving.givers.sub", mine.total.gifts)}
            hue="fern"
            /* R13.2. Authorised and not yet moved by the bank, so it is in
               none of these figures and says so where they are read. */
            note={
              mine.coming.cents > 0
                ? t("giving.onTheWay", { amount: money(mine.coming.cents) })
                : undefined
            }
          />
          {mine.repeating.length > 0 ? (
            <Figure
              icon={<Repeat />}
              label={t("giving.recurring")}
              value={money(
                mine.repeating.reduce((sum, one) => sum + one.amountCents, 0),
              )}
              sub={plural("giving.repeating.count", mine.repeating.length)}
              hue="amber"
            />
          ) : null}
          {mine.pledges.length > 0 ? (
            <Figure
              icon={<Target />}
              label={t("mine.giving.pledgedTotal")}
              value={money(pledgedCents)}
              sub={plural("pledge.count", mine.pledges.length)}
              hue="violet"
            />
          ) : null}
        </div>

        {/* R13.19. January's errand, for whichever year they are asked for. */}
        {mine.total.gifts > 0 || mine.years.length > 0 ? (
          <Block
            icon={<FileText />}
            title={t("giving.statements")}
            action={
              <MyStatement
                church={session.tenantSlug}
                years={mine.years.length > 0 ? mine.years : [mine.year]}
                thisYear={mine.year}
              />
            }
          />
        ) : null}

        {/* R13.16, R17.4. Their own pledges, so somebody who promised in
            October can see in March what is left of it without asking. */}
        {mine.pledges.length > 0 ? (
          <Block icon={<Target />} title={t("pledge.mine")}>
            <ul className="m-0 flex list-none flex-col p-0">
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
                  <li
                    key={one.id}
                    className="flex flex-col gap-2 border-t border-sunken px-5 py-3.5 first:border-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-fg">{one.campaignName}</span>
                        {kept ? (
                          <span
                            className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold"
                            style={{
                              background: "var(--success-soft)", color: "var(--success-text)",
                            }}
                          >
                            <CheckCircle2 className="size-3" aria-hidden />
                            {t("pledge.kept")}
                          </span>
                        ) : (
                          <PaceChip standing={standing} />
                        )}
                      </span>

                      <span data-numeric className="shrink-0 text-[13px] text-fg-muted">
                        {t("pledge.given", { amount: money(one.givenCents) })}
                        {" \u00b7 "}
                        {t("pledge.mine.of", { amount: money(one.amountCents) })}
                      </span>
                    </div>

                    <Progress standing={standing} height={6} />

                    {kept ? null : (
                      <span data-numeric className="text-[12px] text-fg-subtle">
                        {t("pledge.toGo", {
                          amount: money(Math.max(0, one.amountCents - one.givenCents)),
                        })}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Block>
        ) : null}

        {/* R13.3, R13.19. What they have set to repeat, and the way to stop
            it without ringing the church. */}
        {mine.repeating.length > 0 ? (
          <Block icon={<CreditCard />} title={t("giving.recurring")}>
            <ul className="m-0 flex list-none flex-col p-0">
              {mine.repeating.map((one) => (
                <li
                  key={one.id}
                  className="flex flex-wrap items-center gap-3 border-t border-sunken px-5 py-3.5 first:border-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col leading-5">
                    <span data-numeric className="font-semibold text-fg">
                      {[
                        money(one.amountCents),
                        t(
                          `giving.recurring.every.${one.interval}${
                            one.intervalCount > 1 ? `.${one.intervalCount}` : ""
                          }` as never,
                        ),
                      ].join(" \u00b7 ")}
                    </span>
                    <span className="truncate text-[12px] text-fg-subtle">
                      {[
                        one.fundName,
                        one.nextOn
                          ? t("giving.recurring.next", { date: longDate(one.nextOn) })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
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
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {/* R13.19. Everything, in the order it happened. */}
        <Block icon={<Banknote />} title={t("mine.giving.history")}>
          {mine.gifts.length === 0 ? (
            <Nothing>{t("mine.giving.none")}</Nothing>
          ) : (
            <ResizableTable id="my-giving">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr className="bg-sunken text-[12px] font-bold uppercase tracking-[0.04em] text-fg">
                    <th className="w-[140px] px-5 py-2 text-left font-bold">
                      {t("giving.col.date")}
                    </th>
                    {/* The fund takes whatever the others do not. */}
                    <th className="w-full px-3 py-2 text-left font-bold">
                      {t("giving.col.fund")}
                    </th>
                    <th className="w-[100px] px-3 py-2 text-left font-bold">
                      {t("giving.col.method")}
                    </th>
                    <th className="w-[120px] px-3 py-2 text-left font-bold">
                      {t("giving.col.status")}
                    </th>
                    <th className="w-[130px] px-3 py-2 text-right font-bold">
                      {t("giving.col.amount")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {giftRows(mine.gifts).map((row) => {
                    const back = row.kind === "refund";
                    return (
                      <tr
                        key={row.key}
                        className={
                          back
                            /* R13.15. The rule between a gift and what came
                               back off it is drawn inside the row, so the
                               pair reads as one payment with two lines. */
                            ? "italic text-fg-muted [&>td]:relative"
                              + " [&>td]:before:absolute [&>td]:before:inset-x-0"
                              + " [&>td]:before:top-0 [&>td]:before:h-px"
                              + " [&>td]:before:bg-line [&>td]:before:content-['']"
                              + " [&>td:first-child]:before:left-10"
                              + " [&>td:last-child]:before:right-5"
                            : "border-t border-line hover:bg-sunken"
                        }
                      >
                        <td className="whitespace-nowrap py-3 pr-3 pl-5 text-[13px] text-fg-subtle">
                          <span className="flex items-center gap-1">
                            {back ? (
                              <CornerDownRight className="size-3.5 shrink-0" aria-hidden />
                            ) : null}
                            {longDate(row.on)}
                          </span>
                        </td>
                        <td className="min-w-0 px-3 py-3 text-fg">{row.gift.fundName}</td>
                        <td className="px-3 py-3 text-[13px] text-fg-muted">
                          {t(`giving.method.${row.gift.method}` as never)}
                        </td>
                        {/* R13.2, R13.15. Their bank transfer before it
                            arrives, and anything the church gave back. */}
                        <td className="px-3 py-3 text-[13px]">
                          <GiftState status={row.status} audience="giver" />
                        </td>
                        <td
                          data-numeric
                          className={`whitespace-nowrap px-3 py-3 text-right ${
                            row.status === "settled" && !back
                              ? "font-semibold text-fg"
                              : "text-fg-subtle"
                          }`}
                        >
                          <span className="flex items-center justify-end gap-1.5">
                            {row.gift.recurring && !back ? <RepeatMark /> : null}
                            {row.gift.inKindDescription && !back
                              ? row.gift.inKindDescription
                              : money(row.amountCents)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResizableTable>
          )}
        </Block>
      </div>
    </PortalShell>
  );
}
