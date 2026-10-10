/**
 * What may be stored and how heavy it is allowed to be.
 *
 * Pure: no database, nothing that cannot be served to a browser. The server
 * enforces these and every upload screen reads the same numbers off them, so a
 * limit cannot be raised in one place and still be written as the old number on
 * five screens.
 */
export const ONE_MIB = 1024 * 1024;

/** What may be stored, and the largest each is allowed to be. */
export const UPLOAD_RULES = {
  logo: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 2 * ONE_MIB },
  person_photo: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * ONE_MIB },
  /**
   * R9.2. A picture of a group, for the card in the finder.
   *
   * The same ceiling as a person's photo. A church with forty groups spends two
   * hundred megabytes at the limit, which is a tenth of its quota and visible
   * on the storage bar before it gets there.
   */
  group_photo: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * ONE_MIB },
  /**
   * R11.7. What hangs off an item on a service plan: chord charts, a running
   * order as a PDF, a reference track, a slide image, a lyric sheet.
   *
   * No video. Sermon video is a non-goal and a church that uploads one fills
   * its quota in a single file.
   */
  /**
   * R4.1. The picture across the top of a form.
   *
   * The same ceiling as a group's, and for the same reason: it is one wide
   * image per form, and a church with twenty forms is well inside its quota.
   */
  form_cover: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * ONE_MIB },
  /** R14.1. The picture across the top of an event. */
  event_cover: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * ONE_MIB },
  /**
   * R4.1. What somebody attaches when they answer a form.
   *
   * A photo for a dedication, a signed consent as a PDF, a reference letter.
   * The same ceiling a plan item has, and the question itself says how many
   * files it will take, so a church decides its own exposure rather than the
   * platform guessing.
   */
  form_answer: {
    types: [
      "image/png", "image/jpeg", "image/webp", "image/heic",
      "application/pdf", "text/plain",
    ],
    maxBytes: 10 * ONE_MIB,
  },
  plan_item: {
    /*
     * What a church actually hands a musician or a tech desk: a chord chart
     * written in Word, slides as a deck, a running order as a spreadsheet, a
     * reference track, a scan. The list was PDFs, pictures, audio and plain
     * text, so the office's own documents were refused by the box they were
     * dragged into.
     */
    types: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.presentation",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/rtf",
      "image/png", "image/jpeg", "image/webp", "image/gif", "image/heic",
      "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/aac",
      "audio/x-m4a", "audio/flac",
      "text/plain", "text/csv", "text/markdown",
    ],
    maxBytes: 10 * ONE_MIB,
  },
  /**
   * R16.14. What is sent with a message.
   *
   * The same list a plan item takes, because a church sends a chord chart to
   * the worship team's thread and a consent form to a parent, and the two are
   * the same errand. No video, for the same reason as everywhere else.
   */
  message: {
    types: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.presentation",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/rtf",
      "image/png", "image/jpeg", "image/webp", "image/gif", "image/heic",
      "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/aac",
      "audio/x-m4a", "audio/flac",
      "text/plain", "text/csv", "text/markdown",
    ],
    maxBytes: 10 * ONE_MIB,
  },
} as const;

export type UploadPurpose = keyof typeof UPLOAD_RULES;

/**
 * The shape a picture reads best at, by what it is for.
 *
 * A suggestion rather than a rule: anything is accepted and scaled, and a church
 * that only has the photo it has should not be stopped. It is here beside the
 * limit so the screen says both in one line, and so the numbers cannot drift
 * apart from the crop the layout actually uses.
 */
export const SUGGESTED_PIXELS: Record<UploadPurpose, string | null> = {
  logo: "512 x 512",
  person_photo: "600 x 600",
  // The card and the detail page both crop a banner to 16 by 9.
  group_photo: "1600 x 900",
  // A cover is a wide band across the top of a page, cropped 6 to 1.
  form_cover: "1800 x 300",
  form_answer: null,
  event_cover: "1600 x 900",
  plan_item: null,
  message: null,
};
