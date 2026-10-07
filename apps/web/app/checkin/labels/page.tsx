import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withTenant, getLabelLayout, canManageStations } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { LabelLayoutForm } from "./layout-form";
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
  return tabMetadata(t("labels.title"), church);
}

/**
 * R8.11. What prints when a child is checked in.
 *
 * One layout for the church, with the label drawn beside the switches, because
 * the only question anybody has here is what the thing in their hand will say.
 */
export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageStations(session)) {
    return (
      <AppShell session={session} title={t("labels.title")}>
        <Denied />
      </AppShell>
    );
  }

  const layout = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => getLabelLayout(tx, session.tenantId),
  );

  return (
    <AppShell session={session} title={t("labels.title")} max="max-w-[880px]">
      <Link
        href={`/checkin?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("checkin.title")}
      </Link>

      <LabelLayoutForm church={session.tenantSlug} initial={layout} />
    </AppShell>
  );
}
