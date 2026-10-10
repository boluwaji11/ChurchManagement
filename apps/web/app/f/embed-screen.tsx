import { notFound } from "next/navigation";
import { publicForm } from "@connectapp/db";
import { supabaseServer } from "@/lib/supabase/server";
import { PublicForm } from "./[slug]/[form]/public-form";

export async function EmbeddedFormScreen({
  slug,
  form,
}: {
  slug: string;
  form: string;
}) {
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
