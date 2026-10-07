import { NextResponse, type NextRequest } from "next/server";
import { withTenant, getStripeAccount } from "@connectapp/db";
import { stripe, stripeConfigured, asChurch } from "@/lib/stripe";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * R13.3. Where Stripe sends the giver back after they have typed a new card.
 *
 * The card itself was handed to Stripe and is kept there. What arrives here is
 * a session id, which is read on the church's own account to find the payment
 * method behind it. The subscription to point at comes from the session's own
 * metadata rather than from the address bar, so somebody editing the URL
 * cannot move a card onto a gift that is not theirs.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const church = params.get("church") ?? undefined;
  const session = await requireSession(church);
  const back = new URL(`/giving?church=${session.tenantSlug}`, request.nextUrl.origin);

  const id = params.get("session");
  if (!stripeConfigured() || !id || !/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return NextResponse.redirect(back);
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  try {
    const account = await withTenant(ctx, (tx) => getStripeAccount(tx));
    if (!account) return NextResponse.redirect(back);

    const made = await stripe().checkout.sessions.retrieve(
      id,
      { expand: ["setup_intent"] },
      asChurch(account.accountId),
    );

    const setup = made.setup_intent;
    const method =
      setup && typeof setup !== "string"
        ? typeof setup.payment_method === "string"
          ? setup.payment_method
          : setup.payment_method?.id ?? null
        : null;
    const subscriptionId = made.metadata?.subscriptionId;

    if (method && subscriptionId) {
      await stripe().subscriptions.update(
        subscriptionId,
        { default_payment_method: method },
        asChurch(account.accountId),
      );
    }
  } catch (error) {
    console.error("[giving] card change could not be finished", error);
  }

  return NextResponse.redirect(back);
}
