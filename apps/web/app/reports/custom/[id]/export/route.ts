import type { NextRequest } from "next/server";
import {
  withTenant, toCsv, getSavedReport, runReport, canEditPeople, canReadIncidents, FILE_LIMIT,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { refused } from "@/lib/refuse";

export const dynamic = "force-dynamic";

/** R18.10. A built report as a file, run the same way the screen runs it. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return refused(session.role, "buildReports");
  }

  const found = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const saved = await getSavedReport(tx, id);
      if (!saved) return null;
      // The first visual, which is the one the report leads with. A file of
      // six visuals is six files, and that is a different ask.
      const lead = saved.spec.tiles[0];
      if (!lead) return null;
      return { saved, result: await runReport(tx, lead, { limit: FILE_LIMIT }) };
    },
  );

  if (!found) return new Response("", { status: 404 });
  const { saved, result } = found;

  const headers = result.columns.map((one) => t(one.label as never));
  const csv = toCsv(
    result.rows.map((row) =>
      Object.fromEntries(headers.map((head, i) => [head, row[i] ?? ""])),
    ),
    headers,
  );

  const file = saved.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${session.tenantSlug}-${file || "report"}.csv"`,
      "cache-control": "no-store",
    },
  });
}
