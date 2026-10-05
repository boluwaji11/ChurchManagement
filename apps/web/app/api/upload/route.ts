import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  withTenant, assertCanStore, recordFile, setChurchLogo, attachToItem, setGroupPhoto,
  setFormCover,
  canManageChurch, canManageServices, canManageGroups,
  type UploadPurpose,
  setOwnPhoto,
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
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "text/plain": "txt",
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
  // R11.7. Which item on a service plan the bytes belong to.
  const itemId = String(form.get("itemId") ?? "") || null;
  const label = String(form.get("label") ?? "").trim() || null;
  // R9.2. Which group the picture belongs to.
  const groupId = String(form.get("groupId") ?? "") || null;
  // R4.1. Which form the cover belongs to.
  const formId = String(form.get("formId") ?? "") || null;

  const session = await requireSession(slug);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: t("storage.error.empty") }, { status: 400 });
  }
  if (purpose === "logo" && !canManageChurch(session)) {
    return NextResponse.json({ error: t("error.permission.editChurch") }, { status: 403 });
  }
  if (purpose === "group_photo") {
    if (!canManageGroups(session)) {
      return NextResponse.json({ error: t("error.permission.manageGroups") }, { status: 403 });
    }
    if (!groupId) {
      return NextResponse.json({ error: t("group.error.missing") }, { status: 400 });
    }
  }
  if (purpose === "form_cover") {
    if (!canManageChurch(session)) {
      return NextResponse.json({ error: t("error.permission.editChurch") }, { status: 403 });
    }
    if (!formId) {
      return NextResponse.json({ error: t("form.error.missing") }, { status: 400 });
    }
  }
  if (purpose === "plan_item") {
    if (!canManageServices(session)) {
      return NextResponse.json({ error: t("error.permission.managePlans") }, { status: 403 });
    }
    if (!itemId) {
      return NextResponse.json({ error: t("order.error.item") }, { status: 400 });
    }
  }

  const bytes = file.size;
  const contentType = file.type;
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };

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
      const stored = await recordFile(tx, actor, {
        key, purpose, contentType, bytes, uploadedByUserId: session.userId,
      });
      if (purpose === "logo") {
        return (await setChurchLogo(tx, actor, key)).removed;
      }
      if (purpose === "plan_item" && itemId) {
        await attachToItem(tx, actor, { itemId, fileId: stored.id, label });
      }
      if (purpose === "group_photo" && groupId) {
        return (await setGroupPhoto(tx, actor, groupId, key)).removed;
      }
      if (purpose === "form_cover" && formId) {
        return (await setFormCover(tx, actor, formId, key)).removed;
      }
      // R17.1. Somebody's own face. No id is read from the request: the record
      // is the one the signed in account owns.
      if (purpose === "person_photo") {
        return (await setOwnPhoto(tx, { userId: session.userId }, key)).removed;
      }
      return null;
    });

    // The replaced logo or group photo goes from the bucket as well, so the
    // ledger and the object store agree. A failure here leaves an orphan, which the ledger
    // makes findable, rather than a missing file somebody is looking at.
    if (removed) await supabase.storage.from("church").remove([removed]);
  } catch (error) {
    await supabase.storage.from("church").remove([key]);
    return NextResponse.json({ error: explain(error) }, { status: 400 });
  }

  return NextResponse.json({ key });
}
