import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  publicForm, roomForPublicFile, recordPublicFile, UPLOAD_RULES, FILE_TYPES,
  type FileKind,
} from "@hearth/db";
import { supabaseServer } from "@/lib/supabase/server";
import { t } from "@hearth/i18n";

export const dynamic = "force-dynamic";

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
  "text/plain": "txt",
};

/**
 * R4.1. What somebody with no account attaches to a form.
 *
 * Everything is checked here before a byte is written: that the form is one
 * this church has published and is still taking answers, that the question
 * takes files, that the type is one that question asks for, that the size is
 * inside the ceiling, and that the church has the room.
 *
 * The key comes back and rides on the answer. A file uploaded against a form
 * nobody goes on to submit is an orphan in the ledger, swept the same way any
 * other orphan is.
 */
export async function POST(request: Request) {
  const body = await request.formData();
  const churchSlug = String(body.get("church") ?? "");
  const formSlug = String(body.get("form") ?? "");
  const fieldId = String(body.get("field") ?? "");
  const file = body.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: t("storage.error.empty") }, { status: 400 });
  }

  const found = await publicForm(churchSlug, formSlug);
  if (!found || found.state !== "open") {
    return NextResponse.json({ error: t("publicForm.closed") }, { status: 404 });
  }

  const field = found.fields.find((one) => one.id === fieldId);
  if (!field || field.kind !== "file") {
    return NextResponse.json({ error: t("form.error.field") }, { status: 400 });
  }

  const allowed = FILE_TYPES[(field.fileKinds ?? "any") as FileKind];
  if (!allowed.includes(file.type) || !EXTENSION[file.type]) {
    return NextResponse.json({ error: t("storage.error.type") }, { status: 400 });
  }
  if (file.size > UPLOAD_RULES.form_answer.maxBytes) {
    return NextResponse.json({ error: t("storage.error.quota") }, { status: 400 });
  }

  const room = await roomForPublicFile(churchSlug, file.size);
  if (!room) {
    return NextResponse.json({ error: t("storage.error.quota") }, { status: 400 });
  }

  const key = `${churchSlug}/form_answer/${randomUUID()}.${EXTENSION[file.type]}`;
  const supabase = await supabaseServer();
  const upload = await supabase.storage
    .from("church")
    .upload(key, file, { contentType: file.type, upsert: false });

  if (upload.error) {
    return NextResponse.json({ error: t("storage.error.failed") }, { status: 502 });
  }

  await recordPublicFile({
    tenantId: room.tenantId,
    key,
    contentType: file.type,
    bytes: file.size,
  });

  return NextResponse.json({ key, name: file.name });
}
