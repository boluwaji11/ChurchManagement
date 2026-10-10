import { publicTab } from "@/lib/page-metadata";
import { EmbeddedFormScreen } from "../../../embed-screen";
import { t } from "@connectapp/i18n";

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
 * R4.3. The same form, for the church's own page.
 *
 * No brand rule, no church name and no page padding, because the page around it
 * is already the church's and the iframe is sized by the snippet. Everything
 * else is the same component, so the embedded form cannot drift from the linked
 * one.
 */
export default async function EmbeddedFormPage({
  params,
}: {
  params: Promise<{ slug: string; form: string }>;
}) {
  const { slug, form } = await params;
  return <EmbeddedFormScreen slug={slug} form={form} />;
}
