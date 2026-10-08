import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { withTenant, getStripeAccount, canManageGiving } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/back-link";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { Empty } from "@/components/empty";
import { EmbeddedPayouts } from "./embedded";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("payouts.title"), church);
}

/**
 * R13.1. What Stripe is holding, and what it has paid out, inside ConnectApp.
 *
 * Read only. Everything that acts on the money, a refund, a dispute, where a
 * payout lands, stays in the church's own Stripe dashboard, because the church
 * is the account holder there and Stripe carries the risk. A button here would
 * be the first step towards this platform standing between a church and its
 * own money.
 */
export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageGiving(session)) {
    return (
      <Denied role={session.role} action="manageGiving" church={session.tenantSlug} />
      
    );
  }

  const account = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => getStripeAccount(tx),
  );

  return (
    <AppShell session={session} title={t("payouts.title")} wide>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackLink href={`/giving?church=${session.tenantSlug}`} label={t("giving.count.back")} />

          {account ? (
            <a
              href={`https://dashboard.stripe.com/${account.accountId}${
                account.livemode ? "" : "/test"
              }`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 font-medium text-primary no-underline"
            >
              <ExternalLink className="size-4" aria-hidden /> {t("stripe.open")}
            </a>
          ) : null}
        </div>

        {account?.chargesEnabled ? (
          <EmbeddedPayouts
            church={session.tenantSlug}
            publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
          />
        ) : (
          <Empty
            icon="calendar"
            title={t("stripe.state.none")}
            body={t("payouts.connect")}
            action={
              <Link
                href={`/settings/online?church=${session.tenantSlug}`}
                className="font-medium text-primary"
              >
                {t("stripe.connect")}
              </Link>
            }
          />
        )}
      </div>
    </AppShell>
  );
}
