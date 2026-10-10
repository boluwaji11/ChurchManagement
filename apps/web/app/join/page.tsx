import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { JoinScreen } from "./screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("join.action"), church ?? undefined);
}

/**
 * R1.7, R17.1. The church's own door, on the church's own address.
 *
 * The host names the church, so the path does not have to. A church reading
 * its address out loud says "riverside.connectapp.church slash join" rather
 * than saying riverside twice.
 */
export default async function JoinHere({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const church = await churchFromHost();
  if (!church) notFound();
  return <JoinScreen slug={church} fromHost searchParams={searchParams} />;
}
