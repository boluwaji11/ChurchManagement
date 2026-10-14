import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withTenant, getLabelLayout, canManageStations } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireScreen } from "@/lib/shell-data";
import { LabelLayoutForm } from "./layout-form";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("labels.title"));
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
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  const session = await requireScreen();

  if (!canManageStations(session)) {
    return (
      <Denied role={session.role} action="manageStations" church={session.tenantSlug} />
      
    );
  }

  const layout = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => getLabelLayout(tx, session.tenantId),
  );

  return (
    <AppShell session={session} title={t("labels.title")} max="max-w-[880px]">
      <Link
        href={"/checkin"}
        className="-my-2 inline-flex min-h-9 items-center gap-1.5 self-start py-2 font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("checkin.title")}
      </Link>

      <LabelLayoutForm initial={layout} />
    </AppShell>
  );
}
