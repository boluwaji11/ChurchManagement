import { headers } from "next/headers";
import { withTenant, getChurch, getStripeAccount, canManageGiving } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Denied } from "@/components/denied";
import { stripeConfigured } from "@/lib/stripe";
import { syncStripe } from "./actions";
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
  searchParams: Promise<{ church?: string; from?: string }>;
}) {
  const { church, from } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageGiving(session);

  /*
   * R13.1. Back from Stripe, so what we hold about the account is already
   * out of date. Asked once, here, rather than leaving a church looking at
   * "Stripe still needs details" with a button to press to find out it does
   * not.
   */
  if (manage && from === "stripe") await syncStripe(church);

  const read = manage
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        async (tx) => ({
          account: await getStripeAccount(tx),
          profile: await getChurch(tx, session.tenantId),
        }),
      )
    : { account: null, profile: null };

  /*
   * R13.1. What this church has not told us, which Stripe will therefore ask
   * it for. Said before the press rather than after it: the legal name in
   * particular has to match the church's IRS documents, and a mismatch is
   * what holds verification up for a fortnight.
   */
  const missing = read.account
    ? []
    : [
        read.profile?.legalName ? null : "legalName",
        read.profile?.website ? null : "website",
        read.profile?.addressLine1 ? null : "address",
      ].filter((one): one is string => one !== null);

  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.online" lede="settings.lede.online" />
      {manage ? (
        <OnlineGiving
          church={session.tenantSlug}
          account={read.account}
          missing={missing}
          configured={stripeConfigured()}
          origin={`${proto}://${host}`}
        />
      ) : (
        <Denied />
      )}
    </div>
  );
}
