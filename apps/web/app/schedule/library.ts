import { t, type MessageKey } from "@connectapp/i18n";
import type { LibraryItem } from "@/components/library-picker";

/**
 * R10.1, R10.2. The teams churches already run, with the positions each fills.
 *
 * A church setting up serving for the first time is being asked to name its
 * teams and then every position inside them, which is a dozen decisions before
 * anything works. These are the familiar answers. Picking one fills the same
 * form, so every word in it can still be changed before it is saved.
 *
 * Children and Youth come with the children's switch already on, because a
 * position in those rooms gates scheduling on a background check and that is
 * not a default anybody should have to remember.
 */
const TEAMS: {
  key: string;
  label: MessageKey;
  body: MessageKey;
  positions: MessageKey;
  withChildren?: boolean;
}[] = [
  { key: "worship", label: "teamLib.worship", body: "teamLib.worship.body", positions: "teamLib.worship.positions" },
  { key: "tech", label: "teamLib.tech", body: "teamLib.tech.body", positions: "teamLib.tech.positions" },
  { key: "welcome", label: "teamLib.welcome", body: "teamLib.welcome.body", positions: "teamLib.welcome.positions" },
  { key: "children", label: "teamLib.children", body: "teamLib.children.body", positions: "teamLib.children.positions", withChildren: true },
  { key: "youth", label: "teamLib.youth", body: "teamLib.youth.body", positions: "teamLib.youth.positions", withChildren: true },
  { key: "hospitality", label: "teamLib.hospitality", body: "teamLib.hospitality.body", positions: "teamLib.hospitality.positions" },
  { key: "prayer", label: "teamLib.prayer", body: "teamLib.prayer.body", positions: "teamLib.prayer.positions" },
  { key: "setup", label: "teamLib.setup", body: "teamLib.setup.body", positions: "teamLib.setup.positions" },
  { key: "carPark", label: "teamLib.carPark", body: "teamLib.carPark.body", positions: "teamLib.carPark.positions" },
  { key: "safety", label: "teamLib.safety", body: "teamLib.safety.body", positions: "teamLib.safety.positions" },
  { key: "communion", label: "teamLib.communion", body: "teamLib.communion.body", positions: "teamLib.communion.positions" },
  { key: "transport", label: "teamLib.transport", body: "teamLib.transport.body", positions: "teamLib.transport.positions" },
  { key: "counting", label: "teamLib.counting", body: "teamLib.counting.body", positions: "teamLib.counting.positions" },
];

export interface TeamPreset extends LibraryItem {
  body: string;
  positions: { name: string; withChildren: boolean; requiresCheck: boolean }[];
}

/** The library in this church's language, without the teams it already has. */
export function teamLibrary(taken: string[]): TeamPreset[] {
  const held = new Set(taken.map((one) => one.trim().toLowerCase()));

  return TEAMS
    .map((one) => {
      const body = t(one.body);
      return {
        key: one.key,
        label: t(one.label),
        detail: t(one.positions),
        body,
        positions: t(one.positions)
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({
            name,
            withChildren: one.withChildren ?? false,
            requiresCheck: one.withChildren ?? false,
          })),
      };
    })
    .filter((one) => !held.has(one.label.toLowerCase()));
}
