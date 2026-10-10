import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { windowOf } from "../../frame";
import { sheetFor, csvFrom, mayRead } from "../../sheets";
import { refused } from "@/lib/refuse";

export const dynamic = "force-dynamic";

/** R18.10. The milestone lists as a file, over the window they were read at. */
export async function GET(request: NextRequest) {
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  if (!mayRead("milestones", session)) return refused(session.role, "buildReports");

  const window = windowOf(request.nextUrl.searchParams.get("days") ?? undefined);
  const sheet = await sheetFor("milestones", session, window);

  return new Response(csvFrom(sheet.csv), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${session.tenantSlug}-milestones.csv"`,
      "cache-control": "no-store",
    },
  });
}
