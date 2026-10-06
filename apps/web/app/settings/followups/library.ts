import { t, type MessageKey } from "@connectapp/i18n";
import type { LibraryItem } from "@/components/library-picker";

/**
 * R5.2. The journeys a church already walks people through.
 *
 * Follow-up is the part of the product a church has the least language for: it
 * knows it rings a visitor on the Tuesday, and it has never written that down
 * as a stage with steps and days. These are those journeys, in the words a
 * church uses, so the first one takes a press rather than an hour.
 *
 * The steps carry the day each is due, counted from when somebody enters the
 * stage, because "ring them" with no when is a task nobody is late for.
 */
const FLOWS: { key: string; label: MessageKey; body: MessageKey; steps: MessageKey }[] = [
  { key: "firstVisit", label: "flowLib.firstVisit", body: "flowLib.firstVisit.body", steps: "flowLib.firstVisit.steps" },
  { key: "secondVisit", label: "flowLib.secondVisit", body: "flowLib.secondVisit.body", steps: "flowLib.secondVisit.steps" },
  { key: "absent", label: "flowLib.absent", body: "flowLib.absent.body", steps: "flowLib.absent.steps" },
  { key: "group", label: "flowLib.group", body: "flowLib.group.body", steps: "flowLib.group.steps" },
  { key: "serving", label: "flowLib.serving", body: "flowLib.serving.body", steps: "flowLib.serving.steps" },
  { key: "membership", label: "flowLib.membership", body: "flowLib.membership.body", steps: "flowLib.membership.steps" },
  { key: "baptism", label: "flowLib.baptism", body: "flowLib.baptism.body", steps: "flowLib.baptism.steps" },
  { key: "faith", label: "flowLib.faith", body: "flowLib.faith.body", steps: "flowLib.faith.steps" },
  { key: "newBaby", label: "flowLib.newBaby", body: "flowLib.newBaby.body", steps: "flowLib.newBaby.steps" },
  { key: "bereavement", label: "flowLib.bereavement", body: "flowLib.bereavement.body", steps: "flowLib.bereavement.steps" },
  { key: "prayer", label: "flowLib.prayer", body: "flowLib.prayer.body", steps: "flowLib.prayer.steps" },
];

export interface FlowPreset extends LibraryItem {
  body: string;
  steps: { name: string; days: string }[];
}

/** The library in this church's language, without the stages it already keeps. */
export function followupLibrary(taken: string[]): FlowPreset[] {
  const held = new Set(taken.map((one) => one.trim().toLowerCase()));

  return FLOWS
    .map((one) => {
      const steps = t(one.steps)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [name, days] = part.split("|");
          return { name: (name ?? "").trim(), days: (days ?? "").trim() };
        });

      return {
        key: one.key,
        label: t(one.label),
        detail: steps.map((step) => step.name).join(", "),
        body: t(one.body),
        steps,
      };
    })
    .filter((one) => !held.has(one.label.toLowerCase()));
}
