import { notFound } from "next/navigation";
import { publicForm } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { PublicForm } from "../public-form";
import { publicTab } from "@/lib/page-metadata";
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
  const found = await publicForm(slug, form);
  if (!found) notFound();

  let coverUrl: string | null = null;
  if (found.coverKey) {
    const supabase = await supabaseServer();
    const signed = await supabase.storage.from("church").createSignedUrl(found.coverKey, 3600);
    coverUrl = signed.data?.signedUrl ?? null;
  }

  return (
    <main data-theme="light" id="main" className="w-full p-4">
      {coverUrl ? (
        <img src={coverUrl} alt="" className="mb-5 aspect-[6/1] w-full rounded-[14px] object-cover" />
      ) : null}
      <PublicForm
        churchSlug={slug}
        formSlug={form}
        name={found.name}
        intro={found.intro}
        thanks={found.thanks}
        state={found.state}
        fields={found.fields}
      />
    </main>
  );
}
