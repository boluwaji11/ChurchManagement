import { UPLOAD_RULES, ONE_MIB, type UploadPurpose } from "@hearth/db/rules";
import { t } from "@hearth/i18n";

/**
 * What a picture is allowed to weigh, wherever one is uploaded.
 *
 * Read from the rule the server enforces rather than written on the screen, so
 * a limit cannot be raised in one place and still read as the old number in
 * five others. Size in megabytes and nothing about dimensions: a church
 * uploading a photo off a phone cannot act on "1600 by 900", and the one thing
 * that will actually turn them away is a file the server refuses.
 */
export function imageLimit(purpose: UploadPurpose): string {
  return t("image.maxSize", { mb: Math.round(UPLOAD_RULES[purpose].maxBytes / ONE_MIB) });
}
