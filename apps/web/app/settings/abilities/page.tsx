import { withTenant, listAbilities, canManageChurch, ABILITY_KINDS } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AbilityManager } from "./manager";

export const dynamic = "force-dynamic";

/** R2.9. The three lists a church keeps: skills, interests, spiritual gifts. */
export default async function AbilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; show?: string }>;
}) {
  const { church, show } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) {
    return <Banner tone="info" title={t("ability.title")}>{t("forbidden.askAdmin")}</Banner>;
  }

  const includeArchived = show === "archived";
  const all = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    listAbilities(tx, { includeArchived }),
  );

  return (
    <AbilityManager
      church={session.tenantSlug}
      kinds={[...ABILITY_KINDS]}
      abilities={all.map((a) => ({
        id: a.id,
        kind: a.kind,
        name: a.name,
        count: a.count,
        archived: a.archivedAt !== null,
      }))}
      showingArchived={includeArchived}
    />
  );
}
