import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getChurch, getCampaign, listPledges, listFunds,
  canManageGiving, canReadGivingAmounts,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Denied } from "@/components/denied";
import { CampaignScreen } from "./campaign-screen";

export const dynamic = "force-dynamic";

/**
 * R13.16. One campaign: how far along it is, and who has committed to it.
 */
export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canReadGivingAmounts(session) && !canManageGiving(session)) {
    return (
      <AppShell session={session} title={t("campaigns.title")}>
        <Denied />
      </AppShell>
    );
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const read = await withTenant(ctx, async (tx) => ({
    today: churchNow(
      (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
    ).date,
    campaign: await getCampaign(tx, id),
    pledges: await listPledges(tx, ctx, id),
    funds: await listFunds(tx),
  }));

  if (!read.campaign) notFound();

  return (
    <AppShell session={session} title={read.campaign.name} wide>
      <div className="flex flex-col gap-5">
        <Link
          href={`/giving/campaigns?church=${session.tenantSlug}`}
          className="flex w-fit items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("campaigns.back")}
        </Link>

        <CampaignScreen
          church={session.tenantSlug}
          today={read.today}
          campaign={read.campaign}
          pledges={read.pledges}
          funds={read.funds.map((one) => ({ id: one.id, name: one.name }))}
          manage={canManageGiving(session)}
        />
      </div>
    </AppShell>
  );
}
