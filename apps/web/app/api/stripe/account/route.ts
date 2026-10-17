import { NextResponse } from "next/server";
import { markStripeAccount } from "@connectapp/db";
import { stripe, stripeConfigured, stripeLive } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * R13.1, HRT-251. What Stripe tells us about the church's account itself.
 *
 * A church's account is created through Accounts v2, and Stripe routes a v2
 * account's own events to a destination scoped to **our** account rather than
 * to the connected-accounts destination that carries the gifts. They arrive in
 * the other payload style too: a thin event naming the object and where to read
 * it, rather than the whole object inline. Two shapes and two signing secrets,
 * so they get two routes.
 *
 * Without this, a church that finished Stripe's form and closed the tab stayed
 * on screen as a church that had not finished, until somebody pressed Refresh.
 * `syncStripe` still runs on the way back from onboarding; this is what covers
 * the church that never comes back, and the verification Stripe finishes hours
 * later.
 */

/** The account every event here is about, however that event carries it. */
async function accountFrom(notice: ReturnType<typeof read>): Promise<string | null> {
  /*
   * An account link names the account it onboarded only in the full event, so
   * this is the one type worth a second call to Stripe for.
   */
  if (notice.type === "v2.core.account_link.returned") {
    const full = await notice.fetchEvent();
    return full.data.account_id || null;
  }
  /*
   * Everything else names it inline. Some v2 objects are singletons and carry
   * a type and a URL with no id at all, which is why the id is asked for
   * rather than assumed.
   */
  const related = (notice as { related_object?: { id?: unknown } }).related_object;
  return typeof related?.id === "string" ? related.id : null;
}

/** Verifies the signature and gives back what Stripe sent. */
function read(body: string, signature: string, secret: string) {
  return stripe().parseEventNotification(body, signature, secret);
}

/**
 * Every type here means the same thing to this product: the account is not
 * what we last wrote down. Rather than mapping each v2 shape, the account is
 * read back through the v1 view, which is the shape the rest of the product
 * and the gift webhook already use, and which `syncStripe` uses too.
 */
const ABOUT_THE_ACCOUNT = new Set([
  "v2.core.account.updated",
  "v2.core.account.closed",
  "v2.core.account[configuration.merchant].updated",
  "v2.core.account[configuration.merchant].capability_status_updated",
  "v2.core.account[requirements].updated",
  "v2.core.account[identity].updated",
  "v2.core.account_link.returned",
]);

export async function POST(request: Request) {
  if (!stripeConfigured()) return new NextResponse("Not configured", { status: 503 });

  const secret = process.env.STRIPE_ACCOUNT_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Unsigned", { status: 400 });

  const body = await request.text();

  let notice: ReturnType<typeof read>;
  try {
    notice = read(body, signature, secret);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  /*
   * R13.1. A production endpoint is sent both live and test events, because a
   * platform can transact either way under one application. Only the ones
   * from the side this platform's key is on are acted on.
   */
  if (notice.livemode !== stripeLive()) return NextResponse.json({ received: true });

  if (!ABOUT_THE_ACCOUNT.has(notice.type)) return NextResponse.json({ received: true });

  try {
    const accountId = await accountFrom(notice);
    if (!accountId) return NextResponse.json({ received: true });

    /*
     * Reading it back rather than trusting the event is what makes this
     * idempotent: Stripe redelivers whenever it is unsure one landed, and two
     * deliveries of the same truth write the same row twice.
     */
    const state = await stripe().accounts.retrieve(accountId);
    await markStripeAccount({
      accountId: state.id,
      chargesEnabled: state.charges_enabled ?? false,
      payoutsEnabled: state.payouts_enabled ?? false,
      detailsSubmitted: state.details_submitted ?? false,
    });
  } catch (error) {
    /*
     * Answering 500 asks Stripe to deliver it again, which is what we want for
     * a database that was briefly unreachable. An account Stripe no longer
     * knows would be redelivered forever, so it is let go.
     */
    const code = (error as { code?: string })?.code;
    if (code === "resource_missing" || code === "account_invalid") {
      return NextResponse.json({ received: true });
    }
    console.error("[stripe] account event", error);
    return new NextResponse("Not written", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
