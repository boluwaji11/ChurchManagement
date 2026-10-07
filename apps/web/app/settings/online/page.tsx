import { headers } from "next/headers";
import { withTenant, getStripeAccount, canManageGiving } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Denied } from "@/components/denied";
import { stripeConfigured } from "@/lib/stripe";
import { OnlineGiving } from "./online-giving";

export const dynamic = "force-dynamic";

/**
 * R13.1, R13.2. How a church takes a gift by card or bank.
 *
 * The account belongs to the church. Gifts settle to the church's own bank,
 * ConnectApp takes no application fee, and card details never reach this
 * server: the giver types them into Stripe's own page.
 */
export default async function OnlineGivingPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageGiving(session);

  const account = manage
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        (tx) => getStripeAccount(tx),
      )
    : null;

  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.online" lede="settings.lede.online" />
      {manage ? (
        <OnlineGiving
          church={session.tenantSlug}
          account={account}
          configured={stripeConfigured()}
          origin={`${proto}://${host}`}
        />
      ) : (
        <Denied />
      )}
    </div>
  );
}
