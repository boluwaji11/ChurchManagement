import {
  withTenant, listGroupTypes, groupTypeCounts, canManageGroups,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { TypeManager } from "./type-manager";

export const dynamic = "force-dynamic";

/**
 * R9.1. The kinds of group this church runs.
 *
 * Configurable rather than a fixed list, because a church that calls its small
 * groups "life groups" and runs a "prayer chain" should not have to answer to
 * our vocabulary. The colour is the one its groups wear on every card, every
 * filter and every date tile.
 */
export default async function GroupTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageGroups(session);

  const { types, counts } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      types: await listGroupTypes(tx, { includeArchived: true }),
      counts: await groupTypeCounts(tx),
    }),
  );

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.grouptypes" lede="settings.lede.grouptypes" />

      {manage ? (
        <TypeManager
          church={session.tenantSlug}
          types={types.map((one) => ({
            id: one.id,
            name: one.name,
            description: one.description,
            hue: one.hue,
            archived: one.archivedAt !== null,
            groups: counts[one.id] ?? 0,
          }))}
        />
      ) : (
        <Banner tone="info" title={t("settings.tab.grouptypes")}>{t("forbidden.askAdmin")}</Banner>
      )}
    </div>
  );
}
