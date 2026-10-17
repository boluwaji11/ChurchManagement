import { plural, t, type MessageKey } from "@connectapp/i18n";
import type { LibraryItem } from "@/components/library-picker";

/**
 * R8.14, R22.1. The rooms a church already has, before the blank form.
 *
 * Every other thing a church writes down here opens on a list of the ones
 * churches keep: tags, group types, funds, service types, plans, teams and
 * follow-ups all do. Rooms did not, and rooms are the one with a number in
 * them, so a volunteer meeting the panel had to invent both the name and the
 * ages a nursery takes.
 *
 * The age bands are the reason this exists. A church knows what it calls its
 * rooms; what it hesitates over is whether the toddlers' room starts at
 * eighteen months or two years, and getting that wrong sends a child to the
 * wrong room on a service day. These are the usual bands, and every one of
 * them can still be overwritten in the form that opens next.
 */
export interface RoomPreset extends LibraryItem {
  hue: string;
  /** Whether this room holds children, which is what check-in asks about. */
  forChildren: boolean;
  /** The band, in months, as the form stores it. */
  from?: number;
  to?: number;
}

const ROOMS: {
  key: string;
  label: MessageKey;
  hue: string;
  forChildren: boolean;
  from?: number;
  to?: number;
}[] = [
  { key: "nursery", label: "roomLib.nursery", hue: "rose", forChildren: true, from: 0, to: 24 },
  { key: "toddlers", label: "roomLib.toddlers", hue: "amber", forChildren: true, from: 24, to: 48 },
  { key: "preschool", label: "roomLib.preschool", hue: "citron", forChildren: true, from: 36, to: 60 },
  { key: "primary", label: "roomLib.primary", hue: "fern", forChildren: true, from: 60, to: 132 },
  { key: "youth", label: "roomLib.youth", hue: "teal", forChildren: true, from: 132, to: 216 },
  { key: "auditorium", label: "roomLib.auditorium", hue: "indigo", forChildren: false },
  { key: "chapel", label: "roomLib.chapel", hue: "violet", forChildren: false },
  { key: "hall", label: "roomLib.hall", hue: "sky", forChildren: false },
  { key: "prayer", label: "roomLib.prayer", hue: "violet", forChildren: false },
  { key: "meeting", label: "roomLib.meeting", hue: "sky", forChildren: false },
];

/** The band under the name, in the words the form uses. */
function band(from?: number, to?: number): string | undefined {
  if (from === undefined || to === undefined) return undefined;
  const say = (months: number) =>
    months % 12 === 0 && months >= 12
      ? plural("roomLib.years", months / 12)
      : plural("roomLib.months", months);
  return t("roomLib.band", { from: say(from), to: say(to) });
}

/** The library in this church's language, without the rooms it already has. */
export function roomLibrary(taken: string[]): RoomPreset[] {
  const held = new Set(taken.map((one) => one.trim().toLowerCase()));

  return ROOMS.map((one) => ({
    key: one.key,
    label: t(one.label),
    detail: band(one.from, one.to),
    hue: one.hue,
    forChildren: one.forChildren,
    from: one.from,
    to: one.to,
  })).filter((one) => !held.has(one.label.toLowerCase()));
}
