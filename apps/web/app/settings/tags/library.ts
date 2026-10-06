import { t, type MessageKey } from "@connectapp/i18n";
import type { LibraryItem } from "@/components/library-picker";

/**
 * R1.13. The labels churches already put on people.
 *
 * A tag is the escape hatch that stops a church asking us for a column, which
 * makes it the hardest thing to start: nothing on the screen says what one
 * looks like. These are the ones churches write first.
 */
const TAGS: MessageKey[] = [
  "tagLib.newcomer",
  "tagLib.newToFaith",
  "tagLib.baptised",
  "tagLib.volunteer",
  "tagLib.leader",
  "tagLib.musician",
  "tagLib.choir",
  "tagLib.prayerTeam",
  "tagLib.driver",
  "tagLib.needsARide",
  "tagLib.homebound",
  "tagLib.student",
  "tagLib.translator",
  "tagLib.firstAid",
];

/** The library in this church's language, without the tags it already keeps. */
export function tagLibrary(taken: string[]): LibraryItem[] {
  const held = new Set(taken.map((one) => one.trim().toLowerCase()));

  return TAGS
    .map((key) => ({ key, label: t(key) }))
    .filter((one) => !held.has(one.label.toLowerCase()));
}
