"use server";

import { withTenant, getStripeAccount, canManageGiving, PermissionError } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { explain } from "@/lib/explain";

/**
 * R13.1. A session that lets this church read its own Stripe inside our page.
 *
 * Every feature that acts is switched off. The church sees its balance, its
 * payouts and its payments; refunding, disputing and changing where the money
 * lands stay in Stripe's own dashboard, where the church is the account holder
 * and Stripe carries the risk. That arrangement is what keeps this platform
 * out of the money path, and a button here would start to undo it.
 */
export async function accountSession(
  church?: string,
): Promise<{ secret?: string; error?: string }> {
  const session = await requireSession(church);
  if (!canManageGiving(session)) {
    return { error: explain(new PermissionError(session.role, "manageGiving")) };
  }
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };

  const account = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => getStripeAccount(tx),
  );
  if (!account) return { error: "stripe.state.none" };

  try {
    const made = await stripe().accountSessions.create({
      account: account.accountId,
      components: {
        payouts: {
          enabled: true,
          features: {
            instant_payouts: false,
            standard_payouts: false,
            edit_payout_schedule: false,
            external_account_collection: false,
          },
        },
        payments: {
          enabled: true,
          features: {
            refund_management: false,
            dispute_management: false,
            capture_payments: false,
            destination_on_behalf_of_charge_management: false,
          },
        },
      },
    });

    return { secret: made.client_secret };
  } catch {
    return { error: "stripe.failed" };
  }
}
