import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getPersonForEdit, addressFor, listHouseholds, listCustomFields, getCustomValues,
  listTagsWithCounts, listTagsForPerson, canEditPeople,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
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
    address: await addressFor(tx, id),
    tags: await listTagsWithCounts(tx),
    assigned: await listTagsForPerson(tx, id),
  }));

  // Another church's person is reported exactly like a person who does not exist.
  if (!result.person) notFound();
  const { person, households, customFields, customValues, address, tags, assigned } = result;
  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;

  return (
    <AppShell
      session={session}
      max="max-w-[760px]"
    >
      <Link
        href={`/people/${id}?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {display}
      </Link>

      <h2 className="font-display text-[28px] leading-[34px] text-fg">
        {t("personForm.editHeading", { name: display })}
      </h2>

      {person.archivedAt ? (
        <Banner tone="warning" title={t("personForm.archivedNotice.title")} className="">
          {t("personForm.archivedNotice.body")}
        </Banner>
      ) : null}

      {canEditPeople(session.role) ? (
        <PersonForm
          church={session.tenantSlug}
          households={households}
          customFields={customFields}
          customValues={customValues}
          tags={tags.map((x) => ({ id: x.id, name: x.name }))}
          assignedTags={assigned.map((x) => x.id)}
          values={{
            id: person.id,
            address,
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
    </AppShell>
  );
}
