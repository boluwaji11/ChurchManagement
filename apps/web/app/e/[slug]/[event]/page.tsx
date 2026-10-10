import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
import { publicPath } from "@/lib/church-address";
import { EventScreen } from "../../event-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("nav.events"), slug);
}

/**
 * R14.2, R17.1. One event, with the church named in the path.
 *
 * The address a church has handed out in a text message and on its own
 * website, so it goes on working. A church with an address of its own is sent
 * to it, where the host says the name and the path does not repeat it.
 */
export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string; event: string }>;
}) {
  const { slug, event } = await params;

  const elsewhere = await publicPath(slug, `/e/${event}`);
  if (elsewhere) redirect(elsewhere);

  return <EventScreen slug={slug} event={event} />;
}
