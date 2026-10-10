import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { EventScreen } from "../event-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("nav.events"), church ?? undefined);
}

/**
 * R14.2, R17.1. One event, on the church's own address.
 *
 * The host names the church, so the one segment left is the event. On our own
 * host nothing has named a church yet, and a single segment there names no
 * event anybody could be sent to, so there is no page.
 */
export default async function EventHere({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await churchFromHost();
  if (!church) notFound();
  return <EventScreen slug={church} event={slug} fromHost />;
}
