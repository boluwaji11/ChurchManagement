import { withTenant, listTagsWithCounts, canManageTags, canEditPeople } from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { Empty } from "@/components/empty";
import { requireSession } from "@/lib/session";
import { TagManager, NewTag } from "./tag-manager";
import { t } from "@connectapp/i18n";
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


      {!canCreate && !canManage ? (
        <Banner tone="info" title={t("tags.forbidden.title")}>{t("forbidden.askAdmin")}</Banner>
      ) : tags.length === 0 ? (
        <Empty
          icon="tag"
          title={t("tags.empty.title")}
          body={t("tags.empty.body")}
          action={
            canCreate
              ? <NewTag church={session.tenantSlug} filled taken={tags.map((one) => one.name)} />
              : undefined
          }
        />
      ) : (
        <TagManager church={session.tenantSlug} tags={tags} canManage={canManage} canCreate={canCreate} />
      )}
    </div>
  );
}
