import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { EmbeddedFormScreen } from "../../embed-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("form.title"), church ?? undefined);
}

/**
 * R4.3, R17.1. The form for the church's own page, on the church's address.
 *
 * The host names the church, so the segment is the form. On our host nothing
 * has named a church, and a frame has no reader to send anywhere, so it is
 * simply not here.
 */
export default async function EmbeddedFormHere({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const church = await churchFromHost();
  if (!church) notFound();
  return <EmbeddedFormScreen slug={church} form={slug} />;
}
