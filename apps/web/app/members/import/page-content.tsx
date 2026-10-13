import { withTenant, listImports, canEditPeople, canArchivePeople } from "@connectapp/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { ScreenPanel } from "../screen-panel";
import { ImportWizard } from "@/app/import/wizard";
import { ImportHistory } from "@/app/import/history";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata() {
  return tabMetadata(t("import.heading"));
}

interface ImportPageProps {
  searchParams: Promise<Record<string, string>>;
}

/**
 * R19.x, R24.6. Bringing a directory in, in the window over the list.
 *
 * It was a screen of its own with a back link at the top, which is the shape
 * every other thing under Members has already left behind. A church importing
 * its directory is standing on the list it is importing into.
 */
async function renderImportPage({
  presentation,
}: ImportPageProps & { presentation: "page" | "panel" }) {
  const session = await requireSession();
  const mayEdit = canEditPeople(session);

  const batches = mayEdit
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) => listImports(tx))
    : [];

  const body = mayEdit ? (
    <ImportWizard
      church={session.tenantSlug}
      history={
        <ImportHistory
          church={session.tenantSlug}
          canUndo={canArchivePeople(session)}
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
      }
    />
  ) : (
    <Denied role={session.role} action="addPerson" church={session.tenantSlug} />
  );

  if (presentation === "panel") {
    return <ScreenPanel title={t("import.heading")}>{body}</ScreenPanel>;
  }

  return (
    <AppShell session={session} title={t("import.heading")} max="max-w-[1180px]">
      <Link
        href={"/members"}
        className="-my-1.5 inline-flex min-h-8 items-center gap-1.5 self-start py-1.5 font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("members.title")}
      </Link>
      {body}
    </AppShell>
  );
}

export default function ImportPage(props: ImportPageProps) {
  return renderImportPage({ ...props, presentation: "page" });
}

export function ImportPanelPage(props: ImportPageProps) {
  return renderImportPage({ ...props, presentation: "panel" });
}
