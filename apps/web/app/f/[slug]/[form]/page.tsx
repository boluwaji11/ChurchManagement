import { notFound } from "next/navigation";
import { publicForm } from "@hearth/db";
import { t } from "@hearth/i18n";
import { BrandRuleFor } from "@/components/brand-rule";
import { PublicForm } from "./public-form";

export const dynamic = "force-dynamic";

/**
 * R4.3. The form behind the link a church puts on its own website.
 *
 * Whoever follows it has no account and should not need one, which is the whole
 * point of a connection card: the person filling it in is the one the church
 * has no record of yet.
 *
 * The same chrome the public group finder wears, so a church linking both from
 * its site hands people one product rather than two.
 */
export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string; form: string }>;
}) {
  const { slug, form } = await params;
  const found = await publicForm(slug, form);
  if (!found) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <BrandRuleFor hue={found.church.brandHue} className="h-1.5 w-full" />

      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <PublicForm
          churchSlug={slug}
          formSlug={form}
          name={found.name}
          intro={found.intro}
          thanks={found.thanks}
          state={found.state}
          fields={found.fields}
        />

        <p className="mt-10 text-caption text-fg-muted">
          {t("publicForm.from", { church: found.church.name })}
        </p>
      </main>
    </div>
  );
}
