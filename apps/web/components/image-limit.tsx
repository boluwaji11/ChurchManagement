import {
  UPLOAD_RULES, SUGGESTED_PIXELS, ONE_MIB, type UploadPurpose,
} from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";

/**
 * What a picture should be, wherever one is uploaded.
 *
 * Read from the same rules the server enforces rather than written on the
 * screen, so a limit cannot be raised in one place and still read as the old
 * number in five others. The shape is a suggestion and the megabytes are the
 * rule, which is why the shape can be left out for anything with no fixed crop.
 */
export function imageLimit(purpose: UploadPurpose): string {
  const mb = Math.round(UPLOAD_RULES[purpose].maxBytes / ONE_MIB);
  const pixels = SUGGESTED_PIXELS[purpose];
  return pixels
    ? t("image.maxSizeWithPixels", { pixels: pixels.replace(" x ", " × "), mb })
    : t("image.maxSize", { mb });
}
