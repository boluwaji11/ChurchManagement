import { withTenant, listImports, canEditPeople, canArchivePeople } from "@hearth/db";
import { Banner, Button, Card, CardTitle, Separator } from "@hearth/ui";
import { Upload } from "lucide-react";
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageTitle title={t("import.title")} lede={t("import.lede")} />

        {canEditPeople(session.role) ? (
          <div className="flex flex-col gap-8">
            <ImportWizard church={session.tenantSlug} />
            <ImportHistory
              church={session.tenantSlug}
              canUndo={canArchivePeople(session.role)}
              batches={batches.map((b) => ({
                id: b.id,
                filename: b.filename,
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
            {canArchivePeople(session.role) ? (
              <Card>
                <CardTitle>{t("export.title")}</CardTitle>
                <Separator className="my-4" />
                <p className="mb-4 text-[length:var(--d-text-body)] text-fg-muted">{t("export.body")}</p>
                <Button asChild variant="secondary">
                  <a href={`/api/export?church=${session.tenantSlug}`} download>
                    <Upload /> {t("export.download")}
                  </a>
                </Button>
              </Card>
            ) : null}
          </div>
        ) : (
          <Banner tone="info" title={t("forbidden.addPeople")}>{t("forbidden.askAdmin")}</Banner>
        )}
      </main>
    </>
  );
}
