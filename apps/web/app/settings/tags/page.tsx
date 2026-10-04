import { withTenant, listTagsWithCounts, canManageTags, canEditPeople } from "@hearth/db";
import { Banner, EmptyState } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { TagManager } from "./tag-manager";
import { t } from "@hearth/i18n";
import { SettingsHeading } from "../heading";

export const dynamic = "force-dynamic";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const tags = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    listTagsWithCounts(tx),
  );

  const canCreate = canEditPeople(session);
  const canManage = canManageTags(session);

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.tags" lede="settings.lede.tags" />


        {tags.length === 0 && canCreate ? (
          <EmptyState title={t("tags.empty.title")} body={t("tags.empty.body")} />
        ) : null}

        {!canCreate && !canManage ? (
          <Banner tone="info" title={t("tags.forbidden.title")}>{t("forbidden.askAdmin")}</Banner>
        ) : (
          <TagManager church={session.tenantSlug} tags={tags} canManage={canManage} canCreate={canCreate} />
        )}
    </div>
  );
}
