import { notFound } from "next/navigation";
import { t } from "@connectapp/i18n";
import { churchFromHost } from "@/lib/session";
import { publicTab } from "@/lib/page-metadata";
import { FormScreen } from "../form-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata() {
  const church = await churchFromHost();
  return publicTab(t("form.title"), church ?? undefined);
}

/**
 * R4.3, R17.1. One form, on the church's own address.
 *
 * The host names the church, so the one segment left is the form. On our own
 * host nothing has named a church yet, and a single segment there names no
 * form anybody could be sent to, so there is no page.
 */
export default async function FormHere({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { slug } = await params;
  const church = await churchFromHost();
  if (!church) notFound();
  return <FormScreen slug={church} form={slug} searchParams={searchParams} />;
}
