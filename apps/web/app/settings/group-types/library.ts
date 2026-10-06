import { t, type MessageKey } from "@connectapp/i18n";
import type { LibraryItem } from "@/components/library-picker";

/**
 * R9.1. The kinds of group churches already run.
 *
 * Offered when a church writes its first one down, because "what kinds of group
 * does this church run" is a question with a dozen familiar answers and a blank
 * box is the worst way to ask it. Picking one fills the same form.
 */
const TYPES: { key: string; label: MessageKey; body: MessageKey }[] = [
  { key: "smallGroup", label: "typeLib.smallGroup", body: "typeLib.smallGroup.body" },
  { key: "bibleStudy", label: "typeLib.bibleStudy", body: "typeLib.bibleStudy.body" },
  { key: "youth", label: "typeLib.youth", body: "typeLib.youth.body" },
  { key: "children", label: "typeLib.children", body: "typeLib.children.body" },
  { key: "youngAdults", label: "typeLib.youngAdults", body: "typeLib.youngAdults.body" },
  { key: "men", label: "typeLib.men", body: "typeLib.men.body" },
  { key: "women", label: "typeLib.women", body: "typeLib.women.body" },
  { key: "prayer", label: "typeLib.prayer", body: "typeLib.prayer.body" },
  { key: "marriage", label: "typeLib.marriage", body: "typeLib.marriage.body" },
  { key: "seniors", label: "typeLib.seniors", body: "typeLib.seniors.body" },
  { key: "class", label: "typeLib.class", body: "typeLib.class.body" },
  { key: "newMembers", label: "typeLib.newMembers", body: "typeLib.newMembers.body" },
  { key: "outreach", label: "typeLib.outreach", body: "typeLib.outreach.body" },
  { key: "recovery", label: "typeLib.recovery", body: "typeLib.recovery.body" },
];

/** The library in this church's language, without the kinds it already keeps. */
export function groupTypeLibrary(taken: string[]): (LibraryItem & { body: string })[] {
  const held = new Set(taken.map((one) => one.trim().toLowerCase()));

  return TYPES
    .map((one) => ({ key: one.key, label: t(one.label), detail: t(one.body), body: t(one.body) }))
    .filter((one) => !held.has(one.label.toLowerCase()));
}
