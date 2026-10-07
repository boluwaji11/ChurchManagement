import { headers } from "next/headers";
import QRCode from "qrcode";
import { withTenant, getChurch, getStripeAccount, canManageGiving } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Denied } from "@/components/denied";
import { stripeConfigured } from "@/lib/stripe";
import { syncStripe, accountFace } from "./actions";
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

  /*
   * R13.1. What we hold about the account goes out of date on its own.
   *
   * Stripe decides whether an account may take a payment some moments after
   * the church finishes the form, and it tells us through a webhook that a
   * church running this on a laptop may not have listening. So while the
   * account is not yet taking gifts, this screen asks Stripe each time it is
   * opened. Once it is taking them, nothing is asked: the webhook keeps it
   * right from there.
   */
  const stale = manage && stripeConfigured();
  if (stale) {
    const held = await withTenant(
      { tenantId: session.tenantId, role: session.role },
      (tx) => getStripeAccount(tx),
    );
    if (held && !held.chargesEnabled) await syncStripe(church);
  }

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
  const address = `${proto}://${host}/give/${session.tenantSlug}`;

  /*
   * R13.7. The code itself, drawn here so the screen can show it and hand it
   * over as a file. There is nothing secret in it: it is the church's own
   * public giving address.
   */
  // R13.1. What the church recognises: its own name and its own bank.
  const face = read.account ? await accountFace(church) : { name: null, bank: null, payouts: null };

  const qr = read.account?.chargesEnabled
    ? await QRCode.toDataURL(address, { errorCorrectionLevel: "M", margin: 1, width: 512 })
    : null;

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.online" lede="settings.lede.online" />
      {manage ? (
        <OnlineGiving
          church={session.tenantSlug}
          account={read.account}
          missing={missing}
          configured={stripeConfigured()}
          address={address}
          qr={qr}
          face={face}
        />
      ) : (
        <Denied />
      )}
    </div>
  );
}
