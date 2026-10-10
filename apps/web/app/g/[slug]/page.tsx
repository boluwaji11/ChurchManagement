import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { publicPath } from "@/lib/church-address";
import { GroupsScreen } from "../list-screen";
import { GroupScreen } from "../group-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("nav.groups"), (await churchFromHost()) ?? slug);
}

/**
 * R9.5, R17.1. One segment after `/g`, which is a church or a group depending
 * on what the host has already said.
 *
 * On a church's own address the church is named there, so the segment can only
 * be a group. On ours nothing has named a church yet, so the segment is one,
 * and a church with an address of its own is sent to it.
 *
 * Two meanings for one path reads as a trap, and would be if either could be
 * mistaken for the other. The host decides before the segment is read, so
 * there is never a moment where both are possible.
 */
export default async function GroupsOrGroup({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = await churchFromHost();

  // The host named the church, so this is a group inside it.
  if (host) return <GroupScreen slug={host} id={slug} />;

  const elsewhere = await publicPath(slug, "/g");
  if (elsewhere) redirect(elsewhere);

  return <GroupsScreen slug={slug} />;
}
