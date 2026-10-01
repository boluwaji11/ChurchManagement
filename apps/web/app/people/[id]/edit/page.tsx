import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getPersonForEdit, listHouseholds, listCustomFields, getCustomValues, canEditPeople,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { PersonForm } from "../../person-form";
import { t } from "@hearth/i18n";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => ({
    person: await getPersonForEdit(tx, id),
    households: await listHouseholds(tx),
    customFields: await listCustomFields(tx, "person"),
    customValues: await getCustomValues(tx, "person", id),
  }));

  // Another church's person is reported exactly like a person who does not exist.
  if (!result.person) notFound();
  const { person, households, customFields, customValues } = result;
  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/people/${id}?church=${session.tenantSlug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {display}
        </Link>

        <PageTitle title={t("personForm.editTitle", { name: display })} />

        {person.archivedAt ? (
          <Banner tone="warning" title={t("personForm.archivedNotice.title")} className="mb-6">
            {t("personForm.archivedNotice.body")}
          </Banner>
        ) : null}

        {canEditPeople(session.role) ? (
          <PersonForm
            church={session.tenantSlug}
            households={households}
            customFields={customFields}
            customValues={customValues}
            values={{
              id: person.id,
              firstName: person.firstName,
              lastName: person.lastName,
              preferredName: person.preferredName,
              dateOfBirth: person.dateOfBirth,
              lifecycleStatus: person.lifecycleStatus,
              membershipDate: person.membershipDate,
              firstVisitOn: person.firstVisitOn,
              email: person.email,
              phone: person.phone,
              householdId: person.householdId,
              householdRole: person.householdRole,
            }}
          />
        ) : (
          <Banner tone="info" title={t("forbidden.editPeople")}>{t("forbidden.askAdmin")}</Banner>
        )}
      </main>
    </>
  );
}
