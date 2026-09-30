import { withTenant, listCustomFields, canManageCustomFields } from "@hearth/db";
import { Banner, EmptyState } from "@hearth/ui";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { FieldManager } from "./field-manager";
import { t } from "@hearth/i18n";

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
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageTitle title={t("fields.title")} lede={t("fields.lede")} />

        {!canManage ? (
          <Banner tone="info" title={t("fields.forbidden.title")}>{t("forbidden.askAdmin")}</Banner>
        ) : (
          <FieldManager church={session.tenantSlug} fields={fields} canManage={canManage} />
        )}

        {fields.length === 0 && canManage ? (
          <div className="mt-8">
            <EmptyState title={t("fields.empty.title")} body={t("fields.empty.body")} />
          </div>
        ) : null}
      </main>
    </>
  );
}
