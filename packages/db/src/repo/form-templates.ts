import type { MessageKey } from "@connectapp/i18n";
import type { FormFieldKind } from "./form-rules";

/**
 * R4.8. The forms a church writes anyway.
 *
 * Six of them, because these are the ones every church ends up making and
 * making badly: a connection card with no email field, a volunteer application
 * that cannot say which team. Starting from one of these means a church's first
 * form already works, and already writes to the directory, which is the whole
 * of R4.4.
 *
 * Every question that can name part of a person's record carries its target, so
 * a church that never opens that picker still gets records out of its forms.
 *
 * Pure data: labels are catalogue keys rather than words, so these translate
 * with everything else.
 */

export interface TemplateQuestion {
  kind: FormFieldKind;
  label: MessageKey;
  required?: boolean;
  options?: MessageKey[];
  /** R4.4. Which part of a person's record this answer is. */
  mapsTo?: string;
}

export interface FormTemplate {
  key: string;
  name: MessageKey;
  intro: MessageKey;
  hue: string;
  questions: TemplateQuestion[];
}

const WHO: TemplateQuestion[] = [
  { kind: "text", label: "q.firstName", required: true, mapsTo: "first_name" },
  { kind: "text", label: "q.lastName", required: true, mapsTo: "last_name" },
  { kind: "email", label: "q.email", mapsTo: "email" },
  { kind: "phone", label: "q.phone", mapsTo: "phone" },
];

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    key: "connection",
    name: "template.connection",
    intro: "template.connection.intro",
    hue: "amber",
    questions: [
      ...WHO,
      { kind: "select", label: "q.firstTime", options: ["q.yes", "q.no"] },
      { kind: "long_text", label: "q.prayerFor" },
    ],
  },
  {
    key: "prayer",
    name: "template.prayer",
    intro: "template.prayer.intro",
    hue: "violet",
    questions: [
      { kind: "text", label: "q.firstName", mapsTo: "first_name" },
      { kind: "text", label: "q.lastName", mapsTo: "last_name" },
      { kind: "email", label: "q.email", mapsTo: "email" },
      { kind: "long_text", label: "q.prayerFor", required: true },
      { kind: "checkbox", label: "q.prayerPrivate" },
    ],
  },
  {
    key: "membership",
    name: "template.membership",
    intro: "template.membership.intro",
    hue: "indigo",
    questions: [
      ...WHO.map((one) => (one.kind === "email" ? { ...one, required: true } : one)),
      { kind: "text", label: "q.startedComing" },
      { kind: "long_text", label: "q.anythingElse" },
    ],
  },
  {
    key: "volunteer",
    name: "template.volunteer",
    intro: "template.volunteer.intro",
    hue: "fern",
    questions: [
      ...WHO.map((one) => (one.kind === "email" ? { ...one, required: true } : one)),
      {
        kind: "multi_select",
        label: "q.serveWhere",
        required: true,
        options: [
          "q.serve.children", "q.serve.welcome", "q.serve.worship",
          "q.serve.tech", "q.serve.hospitality", "q.serve.prayer",
        ],
      },
      { kind: "long_text", label: "q.servedBefore" },
    ],
  },
  {
    key: "child",
    name: "template.child",
    intro: "template.child.intro",
    hue: "sky",
    /*
     * The record this writes is the child's, so the child's name and birthday
     * carry targets and the parent's details do not. A guardian's number on a
     * child's record would be the child's number, which is wrong on the one
     * form where being wrong matters most.
     */
    questions: [
      { kind: "text", label: "q.childFirstName", required: true, mapsTo: "first_name" },
      { kind: "text", label: "q.childLastName", required: true, mapsTo: "last_name" },
      { kind: "date", label: "q.childBirthday", mapsTo: "date_of_birth" },
      { kind: "text", label: "q.guardianName", required: true },
      { kind: "phone", label: "q.guardianPhone", required: true },
      { kind: "long_text", label: "q.allergies" },
      { kind: "long_text", label: "q.medical" },
    ],
  },
  {
    key: "facility",
    name: "template.facility",
    intro: "template.facility.intro",
    hue: "teal",
    questions: [
      { kind: "text", label: "q.firstName", required: true, mapsTo: "first_name" },
      { kind: "text", label: "q.lastName", required: true, mapsTo: "last_name" },
      { kind: "email", label: "q.email", required: true, mapsTo: "email" },
      { kind: "phone", label: "q.phone", mapsTo: "phone" },
      { kind: "text", label: "q.room", required: true },
      { kind: "date", label: "q.whichDay", required: true },
      { kind: "number", label: "q.howMany" },
      { kind: "long_text", label: "q.whatFor", required: true },
    ],
  },
];

export const templateFor = (key: string): FormTemplate | undefined =>
  FORM_TEMPLATES.find((one) => one.key === key);
