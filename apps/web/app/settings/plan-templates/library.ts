import { t, type MessageKey } from "@connectapp/i18n";
import type { LibraryItem } from "@/components/library-picker";

/**
 * R11.8. The shapes churches already run their services to.
 *
 * A blank template asks a volunteer to write out an order of service from
 * memory, in a form, before they have ever seen one on this screen. These are
 * the familiar shapes: picking one fills the same form, and every line of it is
 * then theirs to rename, retime or throw away.
 */
interface LibraryLine {
  kind: string;
  label: MessageKey;
  minutes: number;
}

const LINE = {
  gathering: { kind: "song", label: "planLib.item.gathering", minutes: 5 },
  welcome: { kind: "announcement", label: "planLib.item.welcome", minutes: 3 },
  worship: { kind: "song", label: "planLib.item.worship", minutes: 20 },
  prayer: { kind: "prayer", label: "planLib.item.prayer", minutes: 5 },
  reading: { kind: "scripture", label: "planLib.item.reading", minutes: 5 },
  sermon: { kind: "sermon", label: "planLib.item.sermon", minutes: 30 },
  teaching: { kind: "sermon", label: "planLib.item.teaching", minutes: 20 },
  response: { kind: "song", label: "planLib.item.response", minutes: 5 },
  offering: { kind: "offering", label: "planLib.item.offering", minutes: 5 },
  notices: { kind: "announcement", label: "planLib.item.notices", minutes: 4 },
  blessing: { kind: "custom", label: "planLib.item.blessing", minutes: 2 },
  communion: { kind: "custom", label: "planLib.item.communion", minutes: 12 },
  testimony: { kind: "custom", label: "planLib.item.testimony", minutes: 5 },
  baptisms: { kind: "custom", label: "planLib.item.baptisms", minutes: 20 },
  discussion: { kind: "custom", label: "planLib.item.discussion", minutes: 20 },
  games: { kind: "custom", label: "planLib.item.games", minutes: 15 },
  carols: { kind: "song", label: "planLib.item.carols", minutes: 25 },
  openPrayer: { kind: "prayer", label: "planLib.item.openPrayer", minutes: 20 },
  groupsPrayer: { kind: "prayer", label: "planLib.item.groupsPrayer", minutes: 15 },
  kidsOut: { kind: "announcement", label: "planLib.item.kidsOut", minutes: 2 },
  reflection: { kind: "custom", label: "planLib.item.reflection", minutes: 5 },
  closing: { kind: "song", label: "planLib.item.closing", minutes: 5 },
} satisfies Record<string, LibraryLine>;

type LineKey = keyof typeof LINE;

const SHAPES: { key: string; label: MessageKey; lines: LineKey[] }[] = [
  {
    key: "morning",
    label: "planLib.morning",
    lines: [
      "gathering", "welcome", "worship", "prayer", "kidsOut", "reading",
      "sermon", "response", "offering", "notices", "blessing",
    ],
  },
  {
    key: "communion",
    label: "planLib.communion",
    lines: [
      "gathering", "welcome", "worship", "reading", "sermon", "communion",
      "response", "offering", "blessing",
    ],
  },
  {
    key: "evening",
    label: "planLib.evening",
    lines: ["worship", "prayer", "reading", "teaching", "response", "openPrayer", "blessing"],
  },
  {
    key: "midweek",
    label: "planLib.midweek",
    lines: ["welcome", "worship", "teaching", "groupsPrayer", "notices"],
  },
  {
    key: "prayerNight",
    label: "planLib.prayerNight",
    lines: ["gathering", "reading", "openPrayer", "groupsPrayer", "closing"],
  },
  {
    key: "youth",
    label: "planLib.youth",
    lines: ["games", "welcome", "worship", "teaching", "discussion", "notices"],
  },
  {
    key: "baptism",
    label: "planLib.baptism",
    lines: [
      "gathering", "welcome", "worship", "testimony", "baptisms", "reading",
      "sermon", "response", "blessing",
    ],
  },
  {
    key: "carols",
    label: "planLib.carols",
    lines: ["carols", "welcome", "reading", "reflection", "offering", "closing"],
  },
];

export interface ShapeLine {
  kind: string;
  title: string;
  minutes: number;
}

export type ShapePreset = LibraryItem & { lines: ShapeLine[] };

/** The library in this church's language, without the shapes it already keeps. */
export function planTemplateLibrary(taken: string[]): ShapePreset[] {
  const held = new Set(taken.map((one) => one.trim().toLowerCase()));

  return SHAPES
    .map((shape) => {
      const lines = shape.lines.map((key) => ({
        kind: LINE[key].kind,
        title: t(LINE[key].label),
        minutes: LINE[key].minutes,
      }));

      return {
        key: shape.key,
        label: t(shape.label),
        detail: t("order.summary", {
          items: String(lines.length),
          minutes: String(lines.reduce((sum, line) => sum + line.minutes, 0)),
        }),
        lines,
      };
    })
    .filter((shape) => !held.has(shape.label.toLowerCase()));
}
