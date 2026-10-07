import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import {
  withTenant, personForUser, listGifts, givingForPerson, getChurch,
  getStripeAccount, listRecurring,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { Button } from "@connectapp/ui";
import { PortalShell, PortalTitle, Panel } from "@/components/portal-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * R13.19, R17.4. A member's own giving, and their own statement.
 *
 * Always theirs to read, whatever their role says about anybody else's. This
 * is the screen that means a church secretary is not asked for a copy of a
 * statement in the second week of January.
 */
export default async function MyGivingPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

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
      /** R13.6. Whether the church can take a gift online at all. */
      online: (await getStripeAccount(tx))?.chargesEnabled ?? false,
      /** R13.3. What they have set to repeat, if anything. */
      repeating: (await listRecurring(tx, { ...ctx, permissions: [...(ctx.permissions ?? []), "giving.amounts"] }, { activeOnly: true }))
        .filter((one) => one.name === session.displayName),
    };
  });

  if (!mine) redirect(`/home?church=${session.tenantSlug}`);

  return (
    <PortalShell session={session}>
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
          </span>

          {mine.total.gifts > 0 ? (
            <Link
              href={`/home/giving/statement?church=${session.tenantSlug}&year=${mine.year}`}
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
            {mine.gifts.map((gift) => (
              <span
                key={gift.id}
                className="grid items-center gap-3 py-3 [grid-template-columns:110px_minmax(0,1fr)_80px_120px]"
              >
                <span className="text-caption text-fg-subtle">
                  {shortDate(gift.receivedOn)}
                </span>
                <span className="min-w-0 truncate font-medium text-fg">{gift.fundName}</span>
                <span className="text-caption text-fg-subtle">
                  {t(`giving.method.${gift.method}` as never)}
                </span>
                <span data-numeric className="text-right font-mono text-fg">
                  {gift.inKindDescription ?? money(gift.amountCents - gift.refundedCents)}
                </span>
              </span>
            ))}
          </Panel>
        )}
      </div>
    </PortalShell>
  );
}
