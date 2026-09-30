import type { NextRequest } from "next/server";
import { withTenant, buildArchive, zipArchive, PermissionError } from "@hearth/db";
import { requireSession } from "@/lib/session";

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
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const session = await requireSession(church);

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
