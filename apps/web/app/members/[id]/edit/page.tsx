import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getPersonForEdit, listHouseholds, listCustomFields, getCustomValues,
  listTagsWithCounts, listTagsForPerson, listContacts, listAddresses, listCampuses, canEditPeople,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PersonForm, PersonFormActions } from "../../person-form";
import { toAddress } from "@/lib/address";
import { t } from "@connectapp/i18n";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("members.title"), church);
}

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

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => {
    // Found by their readable address or by their id, so everything after this
    // works from the record's own id rather than from whatever was in the URL.
    const person = await getPersonForEdit(tx, id);

    // Eight reads that only ever needed the id, in one pass down the connection.
    const [households, customFields, campuses, customValues, tags, assigned, contacts, places] =
      await Promise.all([
        listHouseholds(tx),
        listCustomFields(tx, "person"),
        listCampuses(tx),
        person ? getCustomValues(tx, "person", person.id) : {},
        listTagsWithCounts(tx),
        person ? listTagsForPerson(tx, person.id) : [],
        person ? listContacts(tx, person.id) : [],
        person ? listAddresses(tx, person.id) : [],
      ]);

    return { person, households, customFields, campuses, customValues, tags, assigned, contacts, places };
  });

  // Another church's person is reported exactly like a person who does not exist.
  if (!result.person) notFound();
  const { person, households, customFields, customValues, tags, assigned, campuses, contacts, places } = result;
  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;

  return (
    <AppShell
      session={session}
      max="max-w-[1080px]"
    >
      <Link
        href={`/members/${person.slug}?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {display}
      </Link>

      {/* The two buttons that commit this form sit with its title, where the
          reader's eye already is when they decide they are done. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[22px] leading-[28px] text-fg">
          {t("personForm.editHeading", { name: display })}
        </h2>
        {canEditPeople(session) ? (
          <PersonFormActions editing />
        ) : null}
      </div>

      {person.archivedAt ? (
        <Banner tone="warning" title={t("personForm.archivedNotice.title")} className="">
          {t("personForm.archivedNotice.body")}
        </Banner>
      ) : null}

      {canEditPeople(session) ? (
        <PersonForm
          church={session.tenantSlug}
          households={households}
          campuses={campuses.map((one) => ({ id: one.id, name: one.name }))}
          customFields={customFields}
          customValues={customValues}
          tags={tags.map((x) => ({ id: x.id, name: x.name }))}
          assignedTags={assigned.map((x) => x.id)}
          contacts={contacts}
          places={places}
          values={{
            id: person.id,
            address: toAddress(person.address as never),
            firstName: person.firstName,
            lastName: person.lastName,
            preferredName: person.preferredName,
            dateOfBirth: person.dateOfBirth,
            campusId: person.campusId,
            maritalStatus: person.maritalStatus,
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
        <Denied role={session.role} action="editPerson" church={session.tenantSlug} />
      )}
    </AppShell>
  );
}
