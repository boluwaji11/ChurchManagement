import { t, type MessageKey } from "@connectapp/i18n";

/**
 * R1.10. The details churches keep that the product has no column for.
 *
 * A custom field starts from a blank name box, and a blank name box asks the
 * volunteer to invent the vocabulary of their own directory on the spot. These
 * are the answers churches were already writing down somewhere else: the ones
 * the product models itself (a birthday, a household, an allergy) are not here,
 * because they have a proper home already.
 *
 * Picking one fills the same form somebody would have typed, so it stays a
 * head start rather than a second kind of field.
 */
export interface FieldPreset {
  key: string;
  label: MessageKey;
  type: "text" | "number" | "date" | "select" | "multi_select" | "boolean";
  options?: MessageKey[];
}

export const FIELD_LIBRARY: FieldPreset[] = [
  { key: "occupation", label: "fieldLib.occupation", type: "text" },
  { key: "employer", label: "fieldLib.employer", type: "text" },
  {
    key: "gender",
    label: "fieldLib.gender",
    type: "select",
    options: ["fieldLib.gender.female", "fieldLib.gender.male"],
  },
  { key: "language", label: "fieldLib.language", type: "text" },
  {
    key: "heardAbout",
    label: "fieldLib.heardAbout",
    type: "select",
    options: [
      "fieldLib.heardAbout.friend",
      "fieldLib.heardAbout.event",
      "fieldLib.heardAbout.online",
      "fieldLib.heardAbout.walkedIn",
      "fieldLib.heardAbout.other",
    ],
  },
  { key: "previousChurch", label: "fieldLib.previousChurch", type: "text" },
  {
    key: "gifts",
    label: "fieldLib.gifts",
    type: "multi_select",
    options: [
      "fieldLib.gifts.teaching",
      "fieldLib.gifts.hospitality",
      "fieldLib.gifts.administration",
      "fieldLib.gifts.encouragement",
      "fieldLib.gifts.leadership",
      "fieldLib.gifts.mercy",
      "fieldLib.gifts.giving",
      "fieldLib.gifts.service",
    ],
  },
  {
    key: "skills",
    label: "fieldLib.skills",
    type: "multi_select",
    options: [
      "fieldLib.skills.music",
      "fieldLib.skills.sound",
      "fieldLib.skills.video",
      "fieldLib.skills.childcare",
      "fieldLib.skills.driving",
      "fieldLib.skills.cooking",
      "fieldLib.skills.translation",
      "fieldLib.skills.firstAid",
    ],
  },
  {
    key: "interests",
    label: "fieldLib.interests",
    type: "multi_select",
    options: [
      "fieldLib.interests.worship",
      "fieldLib.interests.outreach",
      "fieldLib.interests.youth",
      "fieldLib.interests.children",
      "fieldLib.interests.prayer",
      "fieldLib.interests.missions",
    ],
  },
  { key: "dietary", label: "fieldLib.dietary", type: "text" },
  {
    key: "shirtSize",
    label: "fieldLib.shirtSize",
    type: "select",
    options: [
      "fieldLib.shirtSize.xs",
      "fieldLib.shirtSize.s",
      "fieldLib.shirtSize.m",
      "fieldLib.shirtSize.l",
      "fieldLib.shirtSize.xl",
      "fieldLib.shirtSize.xxl",
    ],
  },
  { key: "parkingPermit", label: "fieldLib.parkingPermit", type: "text" },
  /*
   * R2.1. The product shipped this as a column and took it back out.
   *
   * It is a question some churches ask and most do not, and the ones that
   * ask it want their own bands: a school in England has Year 7 where one in
   * Missouri has 6th grade. Taking it up fills the same form anybody would
   * have typed, so a church can rename every band before it saves.
   */
  {
    key: "school",
    label: "fieldLib.school",
    type: "select",
    options: [
      "school.pre_k", "school.kindergarten",
      "school.grade_1", "school.grade_2", "school.grade_3", "school.grade_4",
      "school.grade_5", "school.grade_6", "school.grade_7", "school.grade_8",
      "school.grade_9", "school.grade_10", "school.grade_11", "school.grade_12",
      "school.college", "school.graduate",
    ],
  },
];

/** The preset as the form holds it: real words, in this church's language. */
export function presetValues(preset: FieldPreset): { label: string; type: string; options: string[] } {
  return {
    label: t(preset.label),
    type: preset.type,
    options: (preset.options ?? []).map((one) => t(one)),
  };
}
