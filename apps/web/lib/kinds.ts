import { t } from "@connectapp/i18n";
import { BUILT_IN_KINDS, type ItemKindRow } from "@connectapp/db";

/**
 * R11.2. The kinds of plan item, as a screen shows them.
 *
 * A plan item stores a slug. The church's own word wins, and where it has not
 * written one the product's word for one of the eight stands in. Resolved on
 * the server, so a client screen is handed words rather than a catalogue.
 */
export interface KindOption {
  slug: string;
  label: string;
  archived: boolean;
}

const ours = (slug: string) =>
  (BUILT_IN_KINDS as readonly string[]).includes(slug)
    ? t(`order.kind.${slug}` as never)
    : slug;

export function kindOptions(rows: ItemKindRow[]): KindOption[] {
  return rows.map((row) => ({
    slug: row.slug,
    label: row.name ?? ours(row.slug),
    archived: row.archived,
  }));
}

/** What to call a slug an item is already filed under. */
export function kindLabel(slug: string, options: KindOption[]): string {
  return options.find((one) => one.slug === slug)?.label ?? slug;
}
