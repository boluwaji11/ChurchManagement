import { t, type MessageKey } from "@connectapp/i18n";
import type { LibraryItem } from "@/components/library-picker";

/**
 * R11.2. What churches put on a plan.
 *
 * The eight the product has words for, offered before the blank box. Picking
 * one writes it down under its own slug, so a plan already using it keeps
 * reading correctly.
 */
const OURS: { key: string; label: MessageKey }[] = [
  { key: "song", label: "order.kind.song" },
  { key: "scripture", label: "order.kind.scripture" },
  { key: "sermon", label: "order.kind.sermon" },
  { key: "prayer", label: "order.kind.prayer" },
  { key: "offering", label: "order.kind.offering" },
  { key: "announcement", label: "order.kind.announcement" },
  { key: "media", label: "order.kind.media" },
  { key: "custom", label: "order.kind.custom" },
];

/** The library in this church's language, without what it already keeps. */
export function itemKindLibrary(taken: string[]): LibraryItem[] {
  const held = new Set(taken);
  return OURS.filter((one) => !held.has(one.key)).map((one) => ({
    key: one.key,
    label: t(one.label),
  }));
}
