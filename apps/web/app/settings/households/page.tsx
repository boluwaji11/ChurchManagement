import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listHouseholdRows, countArchivedHouseholds, canManageHouseholds,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Empty } from "@/components/empty";
import { SettingsHeading } from "../heading";
import { HouseholdList, NewHousehold } from "./households";
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
  return tabMetadata(t("settings.tab.households"), church);
}

/** R2.1. The families a church keeps together, as things in their own right. */
export default async function HouseholdsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);

  if (!canManageHouseholds(session)) {
    return (
      <Denied role={session.role} action="manageHouseholds" church={session.tenantSlug} />
    );
  }

  const putAway = archived === "1";

  const { rows, archivedCount } = await withTenant(
    { tenantId: session.tenantId, role: session.role, permissions: session.permissions },
    async (tx) => ({
      rows: await listHouseholdRows(tx, putAway ? { archivedOnly: true } : {}),
      archivedCount: await countArchivedHouseholds(tx),
    }),
  );

  return (
    <>
      {putAway ? (
        <Link
          href={`/settings/households?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("households.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "households.archived.title" : "settings.tab.households"}
        lede={putAway ? undefined : "settings.lede.households"}
        action={
          !putAway && rows.length > 0 ? <NewHousehold church={session.tenantSlug} /> : undefined
        }
      />

      {rows.length === 0 ? (
        <Empty
          icon="members"
          title={putAway ? t("households.archived.none") : t("households.empty.title")}
          body={putAway ? undefined : t("households.empty.body")}
          action={putAway ? undefined : <NewHousehold church={session.tenantSlug} />}
        />
      ) : (
        <HouseholdList church={session.tenantSlug} households={rows} onlyArchived={putAway} />
      )}

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/settings/households?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("households.archived", archivedCount)}
        </Link>
      ) : null}
    </>
  );
}
