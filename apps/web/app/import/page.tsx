import { withTenant, listImports, canEditPeople, canArchivePeople } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { ImportWizard } from "./wizard";
import { ImportHistory } from "./history";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const batches = canEditPeople(session.role)
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) => listImports(tx))
    : [];

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageTitle title={t("import.title")} />

        {canEditPeople(session.role) ? (
          <div className="flex flex-col gap-8">
            <ImportWizard church={session.tenantSlug} />
            <ImportHistory
              church={session.tenantSlug}
              canUndo={canArchivePeople(session.role)}
              batches={batches.map((b) => ({
                id: b.id,
                filename: b.filename,
                kind: b.kind,
                status: b.status,
                rowsCreated: b.rowsCreated,
                rowsUpdated: b.rowsUpdated,
                rowsSkipped: b.rowsSkipped,
                committedAt: b.committedAt
                  ? b.committedAt.toLocaleDateString(undefined, {
                      day: "numeric", month: "long", year: "numeric",
                    })
                  : null,
                canRollBack: b.canRollBack,
              }))}
            />
          </div>
        ) : (
          <Banner tone="info" title={t("forbidden.addPeople")}>{t("forbidden.askAdmin")}</Banner>
        )}
      </main>
    </>
  );
}
