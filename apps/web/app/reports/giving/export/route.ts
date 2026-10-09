import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { windowOf } from "../../frame";
import { sheetFor, csvFrom, mayRead } from "../../sheets";
import { refused } from "@/lib/refuse";

export const dynamic = "force-dynamic";

/**
 * R18.10, R1.5. The giving report as a file, over the window it was read at.
 *
 * Refused without the permission to read amounts, because a giving report in a
 * spreadsheet is every amount in it.
 */
export async function GET(request: NextRequest) {
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  if (!mayRead("giving", session)) return refused(session.role, "manageGiving");

  const window = windowOf(request.nextUrl.searchParams.get("days") ?? undefined);
  const sheet = await sheetFor("giving", session, window);

  return new Response(csvFrom(sheet.csv), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${session.tenantSlug}-giving.csv"`,
      "cache-control": "no-store",
    },
  });
}
