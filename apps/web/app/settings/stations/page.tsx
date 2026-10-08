import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listStations, countArchivedStations, canManageStations,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { StationManager } from "./station-manager";
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
  return tabMetadata(t("settings.tab.stations"), church);
}

/**
 * R8.1, R8.2. The devices a church checks members in on.
 *
 * A station that has been put away comes off this list and sits behind the one
 * link under it, which is also the way back to bringing it out again.
 */
export default async function StationsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);
  const putAway = archived === "1";

  const { stations, archivedCount } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      stations: await listStations(tx, putAway ? { archivedOnly: true } : {}),
      archivedCount: await countArchivedStations(tx),
    }),
  );

  if (!canManageStations(session)) {
    return <Denied role={session.role} action="manageStations" church={session.tenantSlug} />;
  }

  return (
    <>
      {putAway ? (
        <Link
          href={`/settings/stations?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("stations.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "stations.archived.title" : "settings.tab.stations"}
        lede={putAway ? undefined : "settings.lede.stations"}
      />
      <StationManager
        church={session.tenantSlug}
        putAway={putAway}
        stations={stations.map((s) => ({
          id: s.id,
          name: s.name,
          mode: s.mode,
          printer: s.printer,
          archived: s.archivedAt !== null,
        }))}
      />

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/settings/stations?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("stations.archived", archivedCount)}
        </Link>
      ) : null}
    </>
  );
}
