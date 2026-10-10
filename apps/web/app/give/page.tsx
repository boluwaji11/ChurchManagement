import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { GiveScreen } from "./screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("nav.giving"), church ?? undefined);
}

/**
 * R13.6, R17.1. Giving, on the church's own address.
 *
 * The host names the church, so the path does not. A church printing this on
 * a card writes riverside.connectapp.church/give rather than saying riverside
 * twice.
 */
export default async function GiveHere() {
  const church = await churchFromHost();
  if (!church) notFound();
  return <GiveScreen slug={church} />;
}
