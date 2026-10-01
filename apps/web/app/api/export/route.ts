import type { NextRequest } from "next/server";
import {
  withTenant, buildArchive, zipArchive, listPeople, resolveList, toCsv, PermissionError,
} from "@hearth/db";
import { requireSession } from "@/lib/session";
import {
  queryFromParams, isFiltered, paramsFromRule, type DirectoryParams,
} from "@/lib/directory-query";

export const dynamic = "force-dynamic";

/**
 * R19.8. One click, ungated, always available.
 *
 * A download rather than a server action, because the result is a file and a
 * file should arrive as a file. The browser's own download handles a church with
 * ten thousand records better than anything built on top of it would.
 *
 * Nothing here checks a plan, a quota, or a support ticket. That is the point:
 * the promise that a church can leave is only worth something if they can prove
 * it on a Tuesday afternoon without asking anybody.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams) as DirectoryParams;
  const session = await requireSession(params.church);

  // A filtered directory exports what the filter says. The same URL that drew
  // the screen draws the file, so the two cannot disagree about what "these
  // people" meant.
  if (isFiltered(params)) return exportView(session, params);

  let zip: Buffer;
  try {
    const archive = await withTenant(
      { tenantId: session.tenantId, role: session.role, userId: session.userId },
      (tx) =>
        buildArchive(
          tx,
          { tenantId: session.tenantId, role: session.role },
          { name: session.tenantName, slug: session.tenantSlug },
        ),
    );
    zip = await zipArchive(archive);
  } catch (error) {
    if (error instanceof PermissionError) {
      return new Response(error.message, { status: 403 });
    }
    throw error;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `hearth-${session.tenantSlug}-${stamp}.zip`;

  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.byteLength),
      // A church's entire directory must not sit in a proxy cache.
      "Cache-Control": "no-store, private",
    },
  });
}

/**
 * The people currently on screen, as one CSV.
 *
 * Not a zip and not every table: somebody filtering the directory and pressing
 * export wants a list they can print, mail merge, or hand to a volunteer. The
 * whole archive is one click away without a filter, and that is the one that
 * matters for leaving.
 */
async function exportView(
  session: { tenantId: string; role: import("@hearth/db").TenantRole; tenantSlug: string; userId: string },
  params: DirectoryParams,
) {
  const rows = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    // R9.3. An export is the easiest place to leak a scope, so it carries
    // the same viewer the screen does.
    async (tx) => {
      // R1.14. A saved list exports the list. Reading the URL any other way
      // here would hand somebody a file that is not what the screen showed.
      const opened = params.list ? await resolveList(tx, params.list) : null;
      const query = opened?.kind === "rule"
        ? queryFromParams(paramsFromRule(opened.rule ?? {}))
        : queryFromParams(params);
      if (opened?.kind === "static") query.ids = opened.ids ?? [];

      return listPeople(tx, { ...query, viewer: { role: session.role, userId: session.userId } });
    },
  );

  const csv = toCsv(
    rows.map((p) => ({
      name: p.displayName,
      first_name: p.firstName,
      last_name: p.lastName,
      household: p.householdName ?? "",
      status: p.lifecycleStatus,
      email: p.primaryEmail ?? "",
      phone: p.primaryPhone ?? "",
      date_of_birth: p.dateOfBirth ?? "",
      archived: p.archivedAt ? "yes" : "no",
    })),
    ["name", "first_name", "last_name", "household", "status", "email", "phone", "date_of_birth", "archived"],
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hearth-${session.tenantSlug}-directory-${stamp}.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
