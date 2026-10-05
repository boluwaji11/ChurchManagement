import { NextResponse, type NextRequest } from "next/server";
import { canManageChurch } from "@hearth/db";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * R4.1. Opening a file somebody attached to a form.
 *
 * The bucket is private, so this signs a link that lives a few minutes and
 * sends the reader to it. The key is checked against the church in the session
 * before anything is signed: a key is a path, and a path in a query string is
 * whatever the caller typed.
 */
export async function GET(request: NextRequest) {
  const church = request.nextUrl.searchParams.get("church") ?? undefined;
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const session = await requireSession(church);

  if (!canManageChurch(session)) return new NextResponse(null, { status: 403 });
  if (!key.startsWith(`${session.tenantSlug}/form_answer/`)) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await supabaseServer();
  const signed = await supabase.storage.from("church").createSignedUrl(key, 300);
  if (!signed.data?.signedUrl) return new NextResponse(null, { status: 404 });

  return NextResponse.redirect(signed.data.signedUrl);
}
