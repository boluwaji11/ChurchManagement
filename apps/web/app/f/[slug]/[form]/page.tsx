import { notFound } from "next/navigation";
import { publicForm } from "@connectapp/db";
import { BrandRuleFor } from "@/components/brand-rule";
import { brandOf } from "@/lib/brand";
import { supabaseServer } from "@/lib/supabase/server";
import { PublicForm } from "./public-form";
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
 * R4.3. The form behind the link a church puts on its own website.
 *
 * Whoever follows it has no account and should not need one, which is the whole
 * point of a connection card: the person filling it in is the one the church
 * has no record of yet.
 *
 * The church's own mark and colour across the top, then the form on a card.
 * This is the one screen a church shows the open web, and it has to look like
 * something the church would be glad to link to.
 */
export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; form: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { slug, form } = await params;
  // R14.2. A church links one form from several events, so which event this
  // was reached from rides the link rather than sitting on the form.
  const { event } = await searchParams;
  const found = await publicForm(slug, form);
  if (!found) notFound();

  // The bucket is private, so the mark and the cover come through signed links.
  const supabase = await supabaseServer();
  const sign = async (key: string | null) => {
    if (!key) return null;
    const signed = await supabase.storage.from("church").createSignedUrl(key, 3600);
    return signed.data?.signedUrl ?? null;
  };
  const logoUrl = await sign(found.church.logoKey);
  const coverUrl = await sign(found.coverKey);

  return (
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col">
      <BrandRuleFor colour={brandOf(found.church)["500"]} className="h-1.5 w-full" />

      {/* The church's name across the top, so somebody who followed a link off
          a bulletin can see whose form this is before they read a word of it. */}
      <header className="sticky top-0 z-20 flex items-center justify-center gap-2.5 border-b border-line bg-[color-mix(in_oklch,var(--surface)_92%,transparent)] px-4 py-3.5 backdrop-blur-[10px]">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            aria-hidden
            className="size-7 rounded-lg border border-line bg-surface object-contain p-0.5"
          />
        ) : (
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ background: brandOf(found.church)["500"] }}
          />
        )}
        <span className="text-label font-semibold text-fg">{found.church.name}</span>
      </header>

      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-sm">
          {/* R24.4. The form's own picture, or its colour flat across the top
              where there is none, which is the rule the group finder follows. */}
          {coverUrl ? (
            <img src={coverUrl} alt="" className="aspect-[6/1] w-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="block h-2.5 w-full"
              style={{ background: `var(--hue-${found.hue}-500)` }}
            />
          )}

          <div className="p-6 sm:p-9">
          <PublicForm
            churchSlug={slug}
            formSlug={form}
            name={found.name}
            intro={found.intro}
            thanks={found.thanks}
            state={found.state}
            fields={found.fields}
            eventSlug={event ?? null}
          />
          </div>
        </div>

      </main>
    </div>
  );
}
