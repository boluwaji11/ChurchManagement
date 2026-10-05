import { notFound } from "next/navigation";
import { publicForm } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalShell } from "@/components/portal-shell";
import { requireSession } from "@/lib/session";
import { BackLink } from "@/components/back-link";
import { PublicForm } from "@/app/f/[slug]/[form]/public-form";
import { knownAnswers } from "../prefill";

export const dynamic = "force-dynamic";

/**
 * R17.9. A form answered by somebody the church already knows.
 *
 * The same form the public link opens, through the same component and the same
 * submit, so there is one form rather than two that drift. What is different is
 * the frame around it and the boxes that are already filled in.
 */
export default async function MyFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ form: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { form } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  const found = await publicForm(session.tenantSlug, form);
  if (!found) notFound();

  return (
    <PortalShell session={session}>
      <BackLink
        href={`/home/forms?church=${session.tenantSlug}`}
        label={t("form.title")}
      />

      <PublicForm
        churchSlug={session.tenantSlug}
        formSlug={form}
        name={found.name}
        intro={found.intro}
        thanks={found.thanks}
        state={found.state}
        fields={found.fields}
        prefill={await knownAnswers(session, found.fields)}
      />
    </PortalShell>
  );
}
