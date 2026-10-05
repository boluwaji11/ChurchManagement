import type { NextRequest } from "next/server";
import {
  withTenant, getChurch, toCsv, attendanceByService, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { backBy, windowOf } from "../../frame";

export const dynamic = "force-dynamic";

/** R18.10. The attendance report as a file, over the window it was read at. */
export async function GET(request: NextRequest) {
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return new Response("", { status: 403 });
  }

  const window = windowOf(request.nextUrl.searchParams.get("days") ?? undefined);

  const rows = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      return attendanceByService(tx, { from: backBy(clock.date, window), to: clock.date });
    },
  );

  const csv = toCsv(
    rows.map((one) => ({ Date: one.occursOn, Service: one.name, Present: one.present })),
    ["Date", "Service", "Present"],
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${session.tenantSlug}-attendance.csv"`,
      "cache-control": "no-store",
    },
  });
}
