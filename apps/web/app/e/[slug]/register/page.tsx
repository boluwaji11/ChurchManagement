import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { RegisterScreen } from "../../register-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("nav.events"), church ?? undefined);
}

/**
 * R14.2, R14.6, R17.1. Taking a place, on the church's own address.
 *
 * The host names the church, so the segment before `/register` is the event.
 */
export default async function RegisterHere({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await churchFromHost();
  if (!church) notFound();
  return <RegisterScreen slug={church} event={slug} fromHost />;
}
