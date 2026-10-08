import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withTenant, listFunds, countArchivedFunds, canManageGiving } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { FundManager } from "./fund-manager";
import { Denied } from "@/components/denied";
import { t, plural } from "@connectapp/i18n";
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
 * R13.9. The causes a church takes gifts for.
 *
 * The one thing this screen has to get right is which funds are restricted:
 * money given for a building is reported apart from the rest, because it
 * cannot be spent on the electricity bill.
 *
 * A fund that has been put away comes off this grid and sits behind the one
 * link under it, which is also the way back to bringing it out again.
 */
export default async function FundsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);
  const manage = canManageGiving(session);
  const putAway = archived === "1";

  const { funds, archivedCount } = manage
    ? await withTenant(
        { tenantId: session.tenantId, role: session.role },
        async (tx) => ({
          funds: await listFunds(tx, putAway ? { archivedOnly: true } : {}),
          archivedCount: await countArchivedFunds(tx),
        }),
      )
    : { funds: [], archivedCount: 0 };

  return (
    <div className="flex flex-col gap-5">
      {putAway ? (
        <Link
          href={`/settings/funds?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("fund.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "fund.archived.title" : "settings.tab.funds"}
        lede={putAway ? undefined : "settings.lede.funds"}
      />

      {manage ? (
        <FundManager church={session.tenantSlug} funds={funds} putAway={putAway} />
      ) : (
        <Denied role={session.role} action="manageGiving" church={session.tenantSlug} />
      )}

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/settings/funds?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("fund.archived", archivedCount)}
        </Link>
      ) : null}
    </div>
  );
}
