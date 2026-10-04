import { withTenant, listImports, canEditPeople, canArchivePeople } from "@hearth/db";
import { Banner } from "@hearth/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
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
    <AppShell
      session={session}
      title={t("import.title")}
      max="max-w-[880px]"
    >
      <Link
        href={`/people?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("people.title")}
      </Link>

      <h2 className="font-display text-[28px] leading-[34px] text-fg">{t("import.heading")}</h2>

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
    </AppShell>
  );
}
