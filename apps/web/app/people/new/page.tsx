import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withTenant, listHouseholds, listCustomFields, canEditPeople } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PersonForm } from "../person-form";
import { t } from "@hearth/i18n";

export const dynamic = "force-dynamic";

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // The form is hidden from a role that cannot use it. The refusal that matters
  // is in the repository, which rejects the write even if this page is bypassed.
  const permitted = canEditPeople(session);

  const data = permitted
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => ({
        households: await listHouseholds(tx),
        customFields: await listCustomFields(tx, "person"),
      }))
    : { households: [], customFields: [] };

  return (
    <AppShell
      session={session}
      title={t("personForm.addTitle")}
      max="max-w-[760px]"
    >
      <Link
        href={`/people?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("people.title")}
      </Link>

      {permitted ? (
        <PersonForm
          church={session.tenantSlug}
          households={data.households}
          customFields={data.customFields}
        />
      ) : (
        <Banner tone="info" title={t("forbidden.addPeople")}>{t("forbidden.askAdmin")}</Banner>
      )}
    </AppShell>
  );
}
