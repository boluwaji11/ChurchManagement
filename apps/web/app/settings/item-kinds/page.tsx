import { withTenant, listItemKinds, canManageServices, BUILT_IN_KINDS } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { KindManager } from "./kind-manager";
import { Denied } from "@/components/denied";

export const dynamic = "force-dynamic";

/**
 * R11.2. What this church puts on a plan.
 *
 * The eight were ours, which is our vocabulary rather than the church's. A
 * congregation that runs a testimony every week writes it down here, and the
 * word it chooses is the word the whole order of service reads.
 */
export default async function ItemKindsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageServices(session);

  const rows = manage
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        (tx) => listItemKinds(tx, { includeArchived: true }),
      )
    : [];

  const ours = BUILT_IN_KINDS as readonly string[];

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.kinds" lede="settings.lede.kinds" />

      {manage ? (
        <KindManager
          church={session.tenantSlug}
          kinds={rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name ?? (ours.includes(row.slug) ? t(`order.kind.${row.slug}` as never) : row.slug),
            archived: row.archived,
          }))}
        />
      ) : (
        <Denied />
      )}
    </div>
  );
}
