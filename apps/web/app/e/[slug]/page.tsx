import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { EventScreen } from "../event-screen";
import { EventsScreen } from "../list-screen";
import { publicPath } from "@/lib/church-address";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("nav.events"), church ?? undefined);
}

/**
 * R14.2, R17.1. One segment after `/e`, which is an event or a church
 * depending on what the host has already said.
 *
 * On a church's own address the church is named there, so the segment can
 * only be an event. On ours nothing has named a church yet, so the segment is
 * one, and what it opens is that church's what's-on page. The host decides
 * before the segment is read, so there is never a moment where both are
 * possible. The same shape `/g/[slug]` already carries.
 */
export default async function EventOrEvents({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await churchFromHost();

  // The host named the church, so this is an event inside it.
  if (church) return <EventScreen slug={church} event={slug} fromHost />;

  const elsewhere = await publicPath(slug, "/e");
  if (elsewhere) redirect(elsewhere);

  return <EventsScreen slug={slug} />;
}
