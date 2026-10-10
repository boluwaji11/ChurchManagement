import { redirect } from "next/navigation";
import { t } from "@connectapp/i18n";
import { publicTab } from "@/lib/page-metadata";
import { publicPath } from "@/lib/church-address";
import { FormScreen } from "../../form-screen";

export const dynamic = "force-dynamic";

/** R17.1. The church this page belongs to, in the browser tab. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return publicTab(t("form.title"), slug);
}

/**
 * R4.3, R17.1. One form, with the church named in the path.
 *
 * The address a church has put on its website and printed on a card, so it
 * goes on working. A church with an address of its own is sent to it, where
 * the host says the name and the path does not repeat it.
 */
export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; form: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { slug, form } = await params;

  const elsewhere = await publicPath(slug, `/f/${form}`);
  if (elsewhere) redirect(elsewhere);

  return <FormScreen slug={slug} form={form} searchParams={searchParams} />;
}
