import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { EventsScreen } from "../list-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("nav.events"), church ?? undefined);
}

/**
 * R14.2, R9.5. What's on, inside the church's own page.
 *
 * A static segment beside `/e/[slug]`, so it wins: on a church's address
 * `/e/embed` is this rather than an event called "embed". The same trade
 * `/e/[slug]/register` and `/g/embed` already carry.
 */
export default async function EventsEmbedHere() {
  const church = await churchFromHost();
  if (!church) notFound();
  return <EventsScreen slug={church} fromHost bare />;
}
