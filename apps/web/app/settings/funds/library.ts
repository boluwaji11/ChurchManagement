import { t, type MessageKey } from "@connectapp/i18n";

/**
 * R13.9. The funds churches already keep.
 *
 * A fund starts from a blank name box, and a blank name box asks a treasurer
 * to invent the vocabulary of their own accounts on the spot. These are the
 * ones churches were already running, with the restriction each usually
 * carries: money given for a building or for benevolence is bound by the
 * giver's intent, and an outreach fund generally is not.
 *
 * Picking one fills the same form somebody would have typed.
 */
export interface FundPreset {
  key: string;
  label: MessageKey;
  /** R13.9. Whether the giver's intent binds this money. */
  restricted: boolean;
}

export const FUND_LIBRARY: FundPreset[] = [
  { key: "building", label: "fundLib.building", restricted: true },
  { key: "benevolence", label: "fundLib.benevolence", restricted: true },
  { key: "missions", label: "fundLib.missions", restricted: true },
  { key: "youth", label: "fundLib.youth", restricted: true },
  { key: "children", label: "fundLib.children", restricted: true },
  { key: "worship", label: "fundLib.worship", restricted: false },
  { key: "outreach", label: "fundLib.outreach", restricted: false },
  { key: "memorial", label: "fundLib.memorial", restricted: true },
  { key: "capital", label: "fundLib.capital", restricted: true },
  { key: "pastor", label: "fundLib.pastor", restricted: true },
  { key: "facilities", label: "fundLib.facilities", restricted: false },
  { key: "transport", label: "fundLib.transport", restricted: false },
];

/** The preset as the form holds it: real words, in this church's language. */
export function presetFund(preset: FundPreset): { name: string; restricted: boolean } {
  return { name: t(preset.label), restricted: preset.restricted };
}
