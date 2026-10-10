import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { GroupsScreen } from "./list-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("nav.groups"), church ?? undefined);
}

/**
 * R9.5, R17.1. The church's groups, on the church's own address.
 *
 * The host names the church, so the path does not.
 */
export default async function GroupsHere() {
  const church = await churchFromHost();
  if (!church) notFound();
  return <GroupsScreen slug={church} fromHost />;
}
