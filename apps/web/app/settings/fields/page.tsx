import { withTenant, listCustomFields, canManageCustomFields } from "@connectapp/db";
import { Empty } from "@/components/empty";
import { requireSession } from "@/lib/session";
import { FieldManager, NewField } from "./field-manager";
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
  return tabMetadata(t("settings.tab.fields"), church);
}

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

  const canManage = canManageCustomFields(session);

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading
        title="settings.tab.fields"
        lede="settings.lede.fields"
        // R24.17. An empty screen offers its action in the middle, where the
        // reader is looking. Two of the same button is one too many.
        action={
          canManage && fields.length > 0
            ? <NewField church={session.tenantSlug} taken={fields.map((one) => one.label)} />
            : undefined
        }
      />


        {fields.length === 0 && canManage ? (
          <Empty
            icon="field"
            title={t("fields.empty.title")}
          body={t("fields.empty.body")}
            action={<NewField church={session.tenantSlug} taken={fields.map((one) => one.label)} />}
          />
        ) : null}

        {!canManage ? (
          <Denied />
        ) : (
          <FieldManager church={session.tenantSlug} fields={fields} canManage={canManage} />
        )}
    </div>
  );
}
