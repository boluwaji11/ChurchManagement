import { withTenant, listTagsWithCounts, canManageTags, canEditPeople } from "@connectapp/db";
import { Empty } from "@/components/empty";
import { requireSession } from "@/lib/session";
import { TagManager, NewTag } from "./tag-manager";
import { t } from "@connectapp/i18n";
import { SettingsHeading } from "../heading";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.tags"), church);
}

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
        <Denied role={session.role} action="createTag" church={session.tenantSlug} />
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
