import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listHouseholds, listCustomFields, listCampuses, canEditPeople,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PersonForm, PersonFormActions } from "../person-form";
import { t } from "@connectapp/i18n";

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
        campuses: await listCampuses(tx),
      }))
    : { households: [], customFields: [], campuses: [] };

  return (
    <AppShell
      session={session}
      title={t("personForm.addTitle")}
      max="max-w-[1080px]"
    >
      <Link
        href={`/members?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("members.title")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[22px] leading-[28px] text-fg">
          {t("personForm.addHeading")}
        </h2>
        {permitted ? (
          <PersonFormActions editing={false} />
        ) : null}
      </div>

      {permitted ? (
        <PersonForm
          church={session.tenantSlug}
          households={data.households}
          customFields={data.customFields}
          campuses={data.campuses.map((one) => ({ id: one.id, name: one.name }))}
        />
      ) : (
        <Banner tone="info" title={t("forbidden.addPeople")}>{t("forbidden.askAdmin")}</Banner>
      )}
    </AppShell>
  );
}
