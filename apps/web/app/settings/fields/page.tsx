import { withTenant, listCustomFields, canManageCustomFields } from "@hearth/db";
import { Banner, EmptyState } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { FieldManager } from "./field-manager";
import { t } from "@hearth/i18n";
import { SettingsHeading } from "../heading";

export const dynamic = "force-dynamic";

export default async function FieldsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const fields = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    listCustomFields(tx, "person"),
  );

  const canManage = canManageCustomFields(session.role);

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.fields" lede="settings.lede.fields" />


        {fields.length === 0 && canManage ? (
          <EmptyState title={t("fields.empty.title")} body={t("fields.empty.body")} />
        ) : null}

        {!canManage ? (
          <Banner tone="info" title={t("fields.forbidden.title")}>{t("forbidden.askAdmin")}</Banner>
        ) : (
          <FieldManager church={session.tenantSlug} fields={fields} canManage={canManage} />
        )}
    </div>
  );
}
