import { withTenant, listFunds, canManageGiving } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { FundManager } from "./fund-manager";
import { Denied } from "@/components/denied";
import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.funds"), church);
}

/**
 * R13.9. What a gift can be given to.
 *
 * The one thing this screen has to get right is which funds are restricted:
 * money given for a building is reported apart from the rest, because it
 * cannot be spent on the electricity bill.
 */
export default async function FundsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageGiving(session);

  const funds = manage
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        (tx) => listFunds(tx, { includeArchived: true }),
      )
    : [];

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeading title="settings.tab.funds" lede="settings.lede.funds" />
      {manage ? <FundManager church={session.tenantSlug} funds={funds} /> : <Denied />}
    </div>
  );
}
