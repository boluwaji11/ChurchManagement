import type { NextRequest } from "next/server";
import { withTenant, listGifts, toCsv, canManageGiving, canReadGivingAmounts } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { refused } from "@/lib/refuse";

export const dynamic = "force-dynamic";

/**
 * R13.23. The gifts as a spreadsheet, for whatever the church keeps its
 * accounts in.
 *
 * A download rather than a server action, because the result is a file. One
 * row a gift with the fund, the method and the amount in the currency's own
 * units, which is what QuickBooks and every other package reads.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const session = await requireSession(params.get("church") ?? undefined);

  if (!canManageGiving(session) && !canReadGivingAmounts(session)) {
    return refused(session.role, "manageGiving");
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const rows = await withTenant(ctx, (tx) =>
    listGifts(tx, ctx, {
      batchId: params.get("count") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      limit: 10_000,
    }),
  );

  const csv = toCsv(
    rows.map((gift) => ({
      Date: gift.receivedOn,
      Giver: gift.memberName ?? "",
      Fund: gift.fundName,
      /* R13.23. What the church's own accounting calls it. */
      Code: gift.fundCode ?? "",
      Method: gift.method,
      Reference: gift.reference ?? "",
      Amount: (gift.amountCents / 100).toFixed(2),
      Fee: (gift.feeCents / 100).toFixed(2),
      Refunded: (gift.refundedCents / 100).toFixed(2),
      /* R13.2. A bank transfer still on its way is on the sheet and out of
         the church's accounts until it says settled. */
      Status: gift.status,
      "In kind": gift.inKindDescription ?? "",
      Note: gift.note ?? "",
    })),
    [
      "Date", "Giver", "Fund", "Code", "Method", "Reference", "Amount", "Fee", "Refunded",
      "Status", "In kind", "Note",
    ],
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="giving-${session.tenantSlug}.csv"`,
    },
  });
}
