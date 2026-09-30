import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  withTenant, assertCanStore, recordFile, setChurchLogo, canManageChurch,
  type UploadPurpose,
} from "@hearth/db";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { t } from "@hearth/i18n";
import { explain } from "@/lib/explain";

export const dynamic = "force-dynamic";

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * R1.16. The one way bytes enter the platform.
 *
 * Type, size and quota are checked in our query layer before anything is
 * written, because a quota found out afterwards is not a quota. The upload
 * itself goes to Supabase Storage on the user's own session, so the service
 * role key stays out of the request path and the bucket policies get a second
 * say on whether this user may write into this church's folder.
 *
 * The name is ours, from a random id and the type we verified. A filename from
 * a browser is attacker-controlled and has no business being a path.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const slug = String(form.get("church") ?? "") || undefined;
  const purpose = String(form.get("purpose") ?? "") as UploadPurpose;
  const file = form.get("file");

  const session = await requireSession(slug);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: t("storage.error.empty") }, { status: 400 });
  }
  if (purpose === "logo" && !canManageChurch(session.role)) {
    return NextResponse.json({ error: t("error.permission.editChurch") }, { status: 403 });
  }

  const bytes = file.size;
  const contentType = file.type;
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };

  try {
    await withTenant(actor, (tx) =>
      assertCanStore(tx, session.tenantId, { purpose, contentType, bytes }),
    );
  } catch (error) {
    return NextResponse.json({ error: explain(error) }, { status: 400 });
  }

  const key = `${session.tenantSlug}/${purpose}/${randomUUID()}.${EXTENSION[contentType]}`;
  const supabase = await supabaseServer();
  const upload = await supabase.storage
    .from("church")
    .upload(key, file, { contentType, upsert: false });

  if (upload.error) {
    return NextResponse.json({ error: t("storage.error.failed") }, { status: 502 });
  }

  try {
    const removed = await withTenant(actor, async (tx) => {
      await recordFile(tx, actor, {
        key, purpose, contentType, bytes, uploadedByUserId: session.userId,
      });
      if (purpose === "logo") {
        return (await setChurchLogo(tx, actor, key)).removed;
      }
      return null;
    });

    // The replaced logo goes from the bucket as well, so the ledger and the
    // object store agree. A failure here leaves an orphan, which the ledger
    // makes findable, rather than a missing file somebody is looking at.
    if (removed) await supabase.storage.from("church").remove([removed]);
  } catch (error) {
    await supabase.storage.from("church").remove([key]);
    return NextResponse.json({ error: explain(error) }, { status: 400 });
  }

  return NextResponse.json({ key });
}
