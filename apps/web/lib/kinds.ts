import { t } from "@connectapp/i18n";
import { BUILT_IN_KINDS, type ItemKindRow } from "@connectapp/db";
import type { KindOption } from "./kind-label";

/**
 * R11.2. The church's list of plan item kinds, in words.
 *
 * Server only: it reads the data layer. A screen is handed the resolved words
 * and uses `kindLabel` from `lib/kind-label.ts`, which carries no such import.
 */
export type { KindOption } from "./kind-label";
export { kindLabel } from "./kind-label";

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
