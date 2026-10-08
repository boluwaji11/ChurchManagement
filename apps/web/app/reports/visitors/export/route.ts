import type { NextRequest } from "next/server";
import {
  withTenant, getChurch, toCsv, visitorList, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { backBy, windowOf } from "../../frame";
import { refused } from "@/lib/refuse";

export const dynamic = "force-dynamic";

/**
 * R18.10. The visitors as a file, over the window the report was read at.
 *
 * The names rather than the rates: a church opens this to work through it, and
 * five percentages in a spreadsheet are nobody's afternoon.
 */
export async function GET(request: NextRequest) {
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return refused(session.role, "buildReports");
  }

  const window = windowOf(request.nextUrl.searchParams.get("days") ?? undefined);

  const visitors = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      return visitorList(tx, { from: backBy(clock.date, window), to: clock.date });
    },
  );

  const columns = [
    "Name", "First visit", "Visits", "Last seen", "In a group", "Serving", "Status", "Follow-up",
  ];

  const csv = toCsv(
    visitors.map((one) => ({
      Name: one.name,
      "First visit": one.firstVisitOn,
      Visits: one.visits,
      "Last seen": one.lastSeenOn ?? "",
      "In a group": one.inGroup ? "Yes" : "No",
      Serving: one.serving ? "Yes" : "No",
      Status: one.status,
      "Follow-up": one.contacted ? "Started" : "None",
    })),
    columns,
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${session.tenantSlug}-visitors.csv"`,
      "cache-control": "no-store",
    },
  });
}
