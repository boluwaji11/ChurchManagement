import type { NextRequest } from "next/server";
import {
  withTenant, getChurch, toCsv, growthByMonth, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { backBy, windowOf } from "../../frame";

export const dynamic = "force-dynamic";

/** R18.10. Growth and retention as a file, over the window it was read at. */
export async function GET(request: NextRequest) {
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return new Response("", { status: 403 });
  }

  const window = windowOf(request.nextUrl.searchParams.get("days") ?? undefined);

  const months = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      return growthByMonth(tx, { from: backBy(clock.date, window), to: clock.date });
    },
  );

  const csv = toCsv(
    months.map((one) => ({
      Month: one.month,
      New: one.joined,
      Lapsed: one.lapsed,
      Net: one.net,
    })),
    ["Month", "New", "Lapsed", "Net"],
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${session.tenantSlug}-growth.csv"`,
      "cache-control": "no-store",
    },
  });
}
