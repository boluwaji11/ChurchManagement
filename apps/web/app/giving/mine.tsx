import Link from "next/link";
import { redirect } from "next/navigation";
import { CornerDownRight, Download } from "lucide-react";
import {
  withTenant, personForUser, listGifts, givingForPerson, onTheWay, getChurch,
  getStripeAccount, listRecurring,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { Button } from "@connectapp/ui";
import { PortalShell, PortalTitle, Panel } from "@/components/portal-shell";
import type { Session } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { GiftState } from "./gift-state";
import { giftRows } from "./rows";

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

    const year = churchNow(
      (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
    ).date.slice(0, 4);

    return {
      year,
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
      repeating: (await listRecurring(tx, { ...ctx, permissions: [...(ctx.permissions ?? []), "giving.amounts"] }, { activeOnly: true }))
        .filter((one) => one.name === session.displayName),
    };
  });

  if (!mine) redirect(`/home?church=${session.tenantSlug}`);

  return (
    <PortalShell session={session} tab={t("mine.giving.title")}>
      <PortalTitle
        title={t("mine.giving.title")}
        action={
          mine.online ? (
            <Button asChild>
              <Link href={`/give/${session.tenantSlug}`}>{t("home.giveNow")}</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
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

        {mine.gifts.length === 0 ? (
          <p className="text-fg-muted">{t("mine.giving.none")}</p>
        ) : (
          <Panel className="flex flex-col divide-y divide-line px-5 py-0">
            <span
              className="grid items-center gap-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-fg [grid-template-columns:110px_minmax(0,1fr)_80px_110px_120px]"
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
                className={`grid items-center gap-3 py-3 [grid-template-columns:110px_minmax(0,1fr)_80px_110px_120px] ${
                  row.kind === "refund"
                    ? "border-t-0 pt-2 relative before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-line before:content-['']"
                    : row.tied
                      ? "pb-2"
                      : ""
                }`}
              >
                {/* R13.15. The turn marks the refund as belonging to the gift
                    under it, and the rule between them comes out. */}
                <span className="flex items-center gap-1 text-caption text-fg-subtle">
                  {row.kind === "refund" ? (
                    <CornerDownRight className="size-3.5 shrink-0" aria-hidden />
                  ) : null}
                  {shortDate(row.on)}
                </span>
                <span className="min-w-0 truncate font-medium text-fg">{row.gift.fundName}</span>
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
                  className={`text-right font-mono ${
                    row.status === "settled" ? "text-fg" : "text-fg-subtle"
                  }`}
                >
                  {row.gift.inKindDescription && row.kind === "gift"
                    ? row.gift.inKindDescription
                    : money(row.amountCents)}
                </span>
              </span>
            ))}
          </Panel>
        )}
      </div>
    </PortalShell>
  );
}
